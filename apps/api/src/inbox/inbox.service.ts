import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityType,
  MessageDirection,
  MessageDeliveryStatus,
  MessageType,
  Prisma,
  SenderType,
} from '@autonode/database';
import type { PaginatedResult } from '@autonode/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MetaGraphService } from '../integrations/meta/meta-graph.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type {
  AddNoteDto,
  ListConversationsQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from './inbox.dto';

const conversationListSelect = {
  id: true,
  status: true,
  priority: true,
  unreadCount: true,
  lastMessageAt: true,
  lastMessagePreview: true,
  aiSummary: true,
  sentiment: true,
  buyingIntent: true,
  priorityScore: true,
  channel: { select: { id: true, type: true, name: true } },
  contact: {
    select: { id: true, name: true, username: true, avatarUrl: true, leadScore: true },
  },
} satisfies Prisma.ConversationSelect;

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(
    orgId: string,
    query: ListConversationsQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const where: Prisma.ConversationWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedAgentId ? { assignedAgentId: query.assignedAgentId } : {}),
      ...(query.channelType ? { channel: { type: query.channelType } } : {}),
      ...(query.search
        ? {
            OR: [
              { contact: { name: { contains: query.search, mode: 'insensitive' } } },
              { contact: { username: { contains: query.search, mode: 'insensitive' } } },
              { lastMessagePreview: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.conversation.findMany({
      where,
      select: conversationListSelect,
      orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > query.limit;
    const data = hasMore ? items.slice(0, query.limit) : items;
    return {
      data,
      nextCursor: hasMore ? (data.at(-1) as { id: string }).id : null,
    };
  }

  async getOne(orgId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        channel: { select: { id: true, type: true, name: true } },
        contact: true,
        labels: { include: { label: true } },
        assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
        messages: { orderBy: { sentAt: 'asc' }, take: 200 },
        internalNotes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  /** Marks all inbound messages read by zeroing the unread counter. */
  async markRead(orgId: string, id: string): Promise<void> {
    await this.assertConversation(orgId, id);
    await this.prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });
  }

  /** Sends an outbound message through Meta and records it. */
  async sendMessage(
    orgId: string,
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: orgId },
      include: { channel: true, contact: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Optimistically persist as PENDING, then dispatch to Meta.
    const message = await this.prisma.message.create({
      data: {
        organizationId: orgId,
        conversationId,
        direction: MessageDirection.OUTBOUND,
        senderType: SenderType.AGENT,
        type: MessageType.TEXT,
        text: dto.text,
        sentByUserId: userId,
        deliveryStatus: MessageDeliveryStatus.PENDING,
      },
    });

    try {
      const externalId = await this.meta.sendText(
        conversation.channel,
        conversation.contact.externalId,
        dto.text,
      );
      const updated = await this.prisma.message.update({
        where: { id: message.id },
        data: { externalId: externalId || null, deliveryStatus: MessageDeliveryStatus.SENT },
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: dto.text.slice(0, 280),
          status: 'PENDING',
        },
      });
      await this.prisma.activity.create({
        data: {
          organizationId: orgId,
          contactId: conversation.contactId,
          conversationId,
          messageId: updated.id,
          userId,
          type: ActivityType.OUTBOUND_MESSAGE,
          title: 'Agent reply sent',
          body: dto.text.slice(0, 500),
        },
      });
      this.realtime.emitMessageCreated(orgId, { conversationId, message: updated });
      return updated;
    } catch (err) {
      const failed = await this.prisma.message.update({
        where: { id: message.id },
        data: {
          deliveryStatus: MessageDeliveryStatus.FAILED,
          error: err instanceof Error ? err.message : 'send failed',
        },
      });
      await this.prisma.activity.create({
        data: {
          organizationId: orgId,
          contactId: conversation.contactId,
          conversationId,
          messageId: failed.id,
          userId,
          type: ActivityType.OUTBOUND_MESSAGE,
          title: 'Agent reply failed',
          body: failed.error ?? 'send failed',
        },
      });
      this.realtime.emitMessageCreated(orgId, { conversationId, message: failed });
      return failed;
    }
  }

  async update(orgId: string, id: string, dto: UpdateConversationDto) {
    await this.assertConversation(orgId, id);
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
        assignedAgentId: dto.assignedAgentId,
      },
      select: conversationListSelect,
    });
    this.realtime.emitConversationUpdated(orgId, updated);
    return updated;
  }

  async addNote(orgId: string, id: string, userId: string, dto: AddNoteDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, contactId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const note = await this.prisma.internalNote.create({
      data: { organizationId: orgId, conversationId: id, authorId: userId, body: dto.body },
      include: { author: { select: { id: true, name: true } } },
    });
    await this.prisma.activity.create({
      data: {
        organizationId: orgId,
        contactId: conversation.contactId,
        conversationId: id,
        userId,
        type: ActivityType.INTERNAL_NOTE,
        title: 'Internal note added',
        body: dto.body.slice(0, 500),
      },
    });
    return note;
  }

  private async assertConversation(orgId: string, id: string): Promise<void> {
    const exists = await this.prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Conversation not found');
  }
}
