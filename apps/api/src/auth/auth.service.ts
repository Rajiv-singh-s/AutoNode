import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import { OrgRole } from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import type { JwtPayload } from './auth.types';
import type { RegisterDto, LoginDto } from './dto';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null };
  organization: { id: string; name: string; slug: string; role: OrgRole };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.crypto.hashPassword(dto.password);
    const slug = await this.uniqueSlug(dto.organizationName);

    // Create user + org + owner membership atomically.
    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: dto.email, name: dto.name, passwordHash },
      });
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        },
      });
      const membership = await tx.membership.create({
        data: { userId: user.id, organizationId: org.id, role: OrgRole.OWNER },
        include: { organization: true },
      });
      return { user, membership };
    });

    return this.issueTokens(user.id, user.email, user.name, membership);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { include: { organization: true }, take: 1 } },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.crypto.verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('User has no organization');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, user.email, user.name, membership);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { memberships: { include: { organization: true }, take: 1 } },
        },
      },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const membership = record.user.memberships[0];
    if (!membership) throw new UnauthorizedException('User has no organization');

    // Rotate: revoke the used token before issuing a new pair.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(record.user.id, record.user.email, record.user.name, membership);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string | null,
    membership: { organizationId: string; role: OrgRole; organization: { name: string; slug: string } },
  ): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      orgId: membership.organizationId,
      role: membership.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const days = this.parseDays(this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '30d'));
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + days * 24 * 3600 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name },
      organization: {
        id: membership.organizationId,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
      },
    };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'org';
    let slug = base;
    let i = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  private parseDays(value: string): number {
    const m = value.match(/^(\d+)d$/);
    return m && m[1] ? Number(m[1]) : 30;
  }
}
