import { Injectable } from '@nestjs/common';
import {
  ConversationStatus,
  LeadStage,
  MessageDirection,
  Prisma,
} from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';

export interface OverviewMetrics {
  openConversations: number;
  unreadMessages: number;
  hotLeads: number;
  todayLeads: number;
  totalContacts: number;
  wonDeals: number;
  conversionRate: number; // 0-1
  revenue: number;
  avgFirstResponseMins: number | null;
  byChannel: { type: string; count: number }[];
  leadsByStage: { stage: string; count: number }[];
  sentiment: { sentiment: string; count: number }[];
}

export interface TimeseriesPoint {
  day: string; // YYYY-MM-DD
  conversations: number;
  leads: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(orgId: string): Promise<OverviewMetrics> {
    const [
      openConversations,
      unreadAgg,
      hotLeads,
      todayLeads,
      totalContacts,
      wonDeals,
      revenueAgg,
      byChannelRaw,
      leadsByStageRaw,
      sentimentRaw,
      avgFirstResponseMins,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { organizationId: orgId, deletedAt: null, status: ConversationStatus.OPEN },
      }),
      this.prisma.conversation.aggregate({
        where: { organizationId: orgId, deletedAt: null },
        _sum: { unreadCount: true },
      }),
      this.prisma.contact.count({
        where: { organizationId: orgId, deletedAt: null, leadScore: { gte: 70 } },
      }),
      this.prisma.contact.count({
        where: { organizationId: orgId, deletedAt: null, createdAt: { gte: startOfToday() } },
      }),
      this.prisma.contact.count({ where: { organizationId: orgId, deletedAt: null } }),
      this.prisma.contact.count({
        where: { organizationId: orgId, deletedAt: null, leadStage: LeadStage.WON },
      }),
      this.prisma.contact.aggregate({
        where: { organizationId: orgId, deletedAt: null, leadStage: LeadStage.WON },
        _sum: { leadValue: true },
      }),
      this.prisma.conversation.groupBy({
        by: ['channelId'],
        where: { organizationId: orgId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.contact.groupBy({
        by: ['leadStage'],
        where: { organizationId: orgId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.conversation.groupBy({
        by: ['sentiment'],
        where: { organizationId: orgId, deletedAt: null, sentiment: { not: null } },
        _count: { _all: true },
      }),
      this.computeAvgFirstResponseMins(orgId),
    ]);

    // Resolve channel ids → types for the breakdown.
    const channels = await this.prisma.channel.findMany({
      where: { organizationId: orgId },
      select: { id: true, type: true },
    });
    const channelType = new Map(channels.map((c) => [c.id, c.type as string]));
    const byChannelMap = new Map<string, number>();
    for (const row of byChannelRaw) {
      const type = channelType.get(row.channelId) ?? 'UNKNOWN';
      byChannelMap.set(type, (byChannelMap.get(type) ?? 0) + row._count._all);
    }

    return {
      openConversations,
      unreadMessages: unreadAgg._sum.unreadCount ?? 0,
      hotLeads,
      todayLeads,
      totalContacts,
      wonDeals,
      conversionRate: totalContacts > 0 ? wonDeals / totalContacts : 0,
      revenue: Number(revenueAgg._sum.leadValue ?? 0),
      avgFirstResponseMins,
      byChannel: [...byChannelMap].map(([type, count]) => ({ type, count })),
      leadsByStage: leadsByStageRaw.map((r) => ({ stage: r.leadStage, count: r._count._all })),
      sentiment: sentimentRaw.map((r) => ({
        sentiment: r.sentiment ?? 'UNKNOWN',
        count: r._count._all,
      })),
    };
  }

  /** Conversations + leads created per day over the last `days` days. */
  async timeseries(orgId: string, days: number): Promise<TimeseriesPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      { day: Date; conversations: bigint; leads: bigint }[]
    >(Prisma.sql`
      WITH days AS (
        SELECT generate_series(${since}::date, CURRENT_DATE, '1 day')::date AS day
      )
      SELECT
        d.day AS day,
        (SELECT count(*) FROM "Conversation" c
          WHERE c."organizationId" = ${orgId} AND c."deletedAt" IS NULL
            AND date_trunc('day', c."createdAt")::date = d.day) AS conversations,
        (SELECT count(*) FROM "Contact" ct
          WHERE ct."organizationId" = ${orgId} AND ct."deletedAt" IS NULL
            AND date_trunc('day', ct."createdAt")::date = d.day) AS leads
      FROM days d
      ORDER BY d.day ASC
    `);

    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      conversations: Number(r.conversations),
      leads: Number(r.leads),
    }));
  }

  /**
   * Average minutes between an inbound message and the first agent reply that
   * follows it, across recent conversations. Real computation, not a stub.
   */
  private async computeAvgFirstResponseMins(orgId: string): Promise<number | null> {
    const conversations = await this.prisma.conversation.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        messages: {
          select: { direction: true, sentAt: true },
          orderBy: { sentAt: 'asc' },
          take: 50,
        },
      },
      take: 200,
      orderBy: { lastMessageAt: 'desc' },
    });

    const deltas: number[] = [];
    for (const c of conversations) {
      const firstInbound = c.messages.find((m) => m.direction === MessageDirection.INBOUND);
      if (!firstInbound) continue;
      const reply = c.messages.find(
        (m) => m.direction === MessageDirection.OUTBOUND && m.sentAt > firstInbound.sentAt,
      );
      if (!reply) continue;
      deltas.push((reply.sentAt.getTime() - firstInbound.sentAt.getTime()) / 60000);
    }
    if (deltas.length === 0) return null;
    return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  }
}
