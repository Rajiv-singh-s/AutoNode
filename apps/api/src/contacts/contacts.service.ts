import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, LeadStage, Prisma } from '@autonode/database';
import type { PaginatedResult } from '@autonode/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { ListContactsQueryDto, UpdateContactDto } from './contacts.dto';

const contactListSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  email: true,
  phone: true,
  leadStage: true,
  leadScore: true,
  leadValue: true,
  source: true,
  tags: true,
  createdAt: true,
  channel: { select: { id: true, type: true } },
} satisfies Prisma.ContactSelect;

// Pipeline column order.
const STAGES: LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.QUALIFIED,
  LeadStage.PROPOSAL,
  LeadStage.NEGOTIATION,
  LeadStage.WON,
  LeadStage.LOST,
];

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, query: ListContactsQueryDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.ContactWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...(query.stage ? { leadStage: query.stage } : {}),
      ...(query.minScore != null ? { leadScore: { gte: query.minScore } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.contact.findMany({
      where,
      select: contactListSelect,
      orderBy: [{ leadScore: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > query.limit;
    const data = (hasMore ? items.slice(0, query.limit) : items).map(this.serialize);
    return { data, nextCursor: hasMore ? (items[query.limit - 1] as { id: string }).id : null };
  }

  async getOne(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        channel: { select: { id: true, type: true, name: true } },
        conversations: {
          select: {
            id: true,
            status: true,
            priority: true,
            lastMessageAt: true,
            lastMessagePreview: true,
            buyingIntent: true,
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 40,
        },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return { ...contact, leadValue: contact.leadValue ? Number(contact.leadValue) : null };
  }

  async listActivities(orgId: string, id: string) {
    await this.assert(orgId, id);
    return this.prisma.activity.findMany({
      where: { organizationId: orgId, contactId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async update(orgId: string, id: string, dto: UpdateContactDto) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true, leadStage: true, leadScore: true, leadValue: true, tags: true },
    });
    if (!existing) throw new NotFoundException('Contact not found');
    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        leadStage: dto.leadStage,
        leadScore: dto.leadScore,
        leadValue: dto.leadValue != null ? new Prisma.Decimal(dto.leadValue) : undefined,
        tags: dto.tags,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
      select: contactListSelect,
    });
    if (dto.leadStage && dto.leadStage !== existing.leadStage) {
      await this.prisma.activity.create({
        data: {
          organizationId: orgId,
          contactId: id,
          type: ActivityType.STAGE_CHANGED,
          title: 'Lead stage updated',
          body: `${existing.leadStage} -> ${dto.leadStage}`,
        },
      });
    }
    if (dto.leadScore != null && dto.leadScore !== existing.leadScore) {
      await this.prisma.activity.create({
        data: {
          organizationId: orgId,
          contactId: id,
          type: ActivityType.SCORE_CHANGED,
          title: 'Lead score updated',
          body: `${existing.leadScore} -> ${dto.leadScore}`,
        },
      });
    }
    if (dto.leadValue != null && dto.leadValue !== Number(existing.leadValue ?? 0)) {
      await this.prisma.activity.create({
        data: {
          organizationId: orgId,
          contactId: id,
          type: ActivityType.VALUE_CHANGED,
          title: 'Lead value updated',
          body: `${Number(existing.leadValue ?? 0)} -> ${dto.leadValue}`,
        },
      });
    }
    if (dto.tags && JSON.stringify(dto.tags) !== JSON.stringify(existing.tags)) {
      await this.prisma.activity.create({
        data: {
          organizationId: orgId,
          contactId: id,
          type: ActivityType.TAGS_UPDATED,
          title: 'Tags updated',
          body: dto.tags.join(', ') || 'No tags',
        },
      });
    }
    return this.serialize(updated);
  }

  /** Kanban view: contacts grouped by lead stage (capped per column). */
  async pipeline(orgId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: contactListSelect,
      orderBy: [{ leadScore: 'desc' }],
      take: 500,
    });

    const columns = STAGES.map((stage) => ({
      stage,
      contacts: contacts.filter((c) => c.leadStage === stage).map(this.serialize),
      value: contacts
        .filter((c) => c.leadStage === stage)
        .reduce((sum, c) => sum + (c.leadValue ? Number(c.leadValue) : 0), 0),
    }));
    return { columns };
  }

  private serialize<T extends { leadValue: Prisma.Decimal | null }>(c: T) {
    return { ...c, leadValue: c.leadValue ? Number(c.leadValue) : null };
  }

  private async assert(orgId: string, id: string): Promise<void> {
    const exists = await this.prisma.contact.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Contact not found');
  }
}
