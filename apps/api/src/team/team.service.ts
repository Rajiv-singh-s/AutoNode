import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { InviteStatus, OrgRole } from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import type { InviteMemberDto, UpdateMemberRoleDto } from './team.dto';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  /** List all active members of the organization. */
  async listMembers(orgId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
    }));
  }

  /** List pending invitations. */
  listInvitations(orgId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId: orgId, status: InviteStatus.PENDING, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Invite a new member by email. Creates or re-activates an invitation. */
  async invite(orgId: string, invitedById: string, dto: InviteMemberDto): Promise<{ id: string; token: string }> {
    // Cannot invite someone already a member.
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      const existing = await this.prisma.membership.findFirst({
        where: { organizationId: orgId, userId: existingUser.id },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('This email address already belongs to a team member');
      }
    }

    // Prevent duplicate pending invite.
    const dup = await this.prisma.invitation.findFirst({
      where: { organizationId: orgId, email: dto.email, status: InviteStatus.PENDING, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('An active invitation already exists for this email');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    const invite = await this.prisma.invitation.upsert({
      where: { organizationId_email: { organizationId: orgId, email: dto.email } },
      update: { role: dto.role, token, status: InviteStatus.PENDING, expiresAt, invitedById },
      create: {
        organizationId: orgId,
        email: dto.email,
        role: dto.role,
        token,
        status: InviteStatus.PENDING,
        invitedById,
        expiresAt,
      },
      select: { id: true },
    });

    return { id: invite.id, token };
  }

  /** Accept an invite token — creates the membership if valid. */
  async acceptInvitation(token: string, userId: string): Promise<{ organizationId: string; role: OrgRole }> {
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
      include: { organization: { select: { id: true } } },
    });
    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    // Check the accepting user's email matches the invite.
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Check not already a member.
    const existing = await this.prisma.membership.findFirst({
      where: { organizationId: invite.organizationId, userId },
      select: { id: true },
    });
    if (existing) throw new ConflictException('You are already a member of this organization');
    await this.billing.enforceLimit(invite.organizationId, 'teamMembers');

    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: { userId, organizationId: invite.organizationId, role: invite.role },
      }),
      this.prisma.invitation.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      }),
    ]);

    return { organizationId: invite.organizationId, role: invite.role };
  }

  /** Revoke a pending invitation. */
  async revokeInvitation(orgId: string, inviteId: string): Promise<{ success: true }> {
    const invite = await this.prisma.invitation.findFirst({
      where: { id: inviteId, organizationId: orgId },
      select: { id: true, status: true },
    });
    if (!invite) throw new NotFoundException('Invitation not found');
    await this.prisma.invitation.update({
      where: { id: inviteId },
      data: { status: InviteStatus.REVOKED },
    });
    return { success: true };
  }

  /** Update a member's role. Cannot downgrade the last OWNER. */
  async updateRole(orgId: string, membershipId: string, actorId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
      include: { user: { select: { id: true } } },
    });
    if (!membership) throw new NotFoundException('Member not found');

    // Cannot change own role via this endpoint.
    if (membership.user.id === actorId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Protect the last OWNER.
    if (membership.role === OrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: { organizationId: orgId, role: OrgRole.OWNER },
      });
      if (ownerCount <= 1) throw new ForbiddenException('Cannot remove the last owner');
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  /** Remove a member from the organization. Cannot remove the last OWNER. */
  async removeMember(orgId: string, membershipId: string, actorId: string): Promise<{ success: true }> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
      include: { user: { select: { id: true } } },
    });
    if (!membership) throw new NotFoundException('Member not found');

    if (membership.user.id === actorId) {
      throw new ForbiddenException('You cannot remove yourself from the organization');
    }

    if (membership.role === OrgRole.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: { organizationId: orgId, role: OrgRole.OWNER },
      });
      if (ownerCount <= 1) throw new ForbiddenException('Cannot remove the last owner');
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { success: true };
  }
}
