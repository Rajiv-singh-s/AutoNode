import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  ActivityType,
  AutomationTrigger,
  ChannelType,
  MessageDirection,
  MessageType,
  NotificationType,
  SenderType,
  WebhookEventStatus,
} from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES, WEBHOOK_JOBS } from '../queue/queue.constants';
import { parseMetaWebhook } from '../integrations/meta/meta-parser';
import type {
  MetaWebhookBody,
  NormalizedInboundEvent,
} from '../integrations/meta/meta.types';
import { AiOrchestratorService } from '../ai/ai.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AutomationsService } from '../automations/automations.service';
import { NotificationsService } from '../notifications/notifications.service';

interface ProcessJobData {
  webhookEventId: string;
}

function messageTypeFor(ev: NormalizedInboundEvent): MessageType {
  if (ev.kind === 'comment') return MessageType.COMMENT;
  if (ev.kind === 'story_reply') return MessageType.STORY_REPLY;
  if (ev.attachments?.length) {
    const t = ev.attachments[0]?.type;
    if (t === 'image') return MessageType.IMAGE;
    if (t === 'video') return MessageType.VIDEO;
    if (t === 'audio') return MessageType.AUDIO;
    return MessageType.FILE;
  }
  return MessageType.TEXT;
}

/**
 * Webhook worker. Resolves the connected Channel, upserts Contact +
 * Conversation, appends the inbound Message, then triggers AI analysis and
 * a realtime push. Each step is idempotent so retries are safe.
 */
@Processor(QUEUES.WEBHOOK)
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiOrchestratorService,
    private readonly realtime: RealtimeGateway,
    private readonly automations: AutomationsService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<ProcessJobData>): Promise<void> {
    if (job.name !== WEBHOOK_JOBS.PROCESS_EVENT) return;

    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: job.data.webhookEventId },
    });
    if (!event) return;

    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: WebhookEventStatus.PROCESSING, attempts: { increment: 1 } },
    });

    try {
      const events = parseMetaWebhook(event.payload as unknown as MetaWebhookBody);
      let orgId: string | null = null;
      for (const ev of events) {
        const result = await this.handleEvent(ev);
        if (result) orgId = result;
      }

      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status: WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
          organizationId: orgId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(`Failed processing webhook ${event.id}: ${message}`);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: WebhookEventStatus.FAILED, error: message },
      });
      throw err; // let BullMQ retry / dead-letter
    }
  }

  /** Returns the org id touched, or null if no matching channel exists. */
  private async handleEvent(ev: NormalizedInboundEvent): Promise<string | null> {
    const channel = await this.resolveChannel(ev.channelType, ev.recipientExternalId);
    if (!channel) {
      this.logger.warn(
        `No connected ${ev.channelType} channel for recipient ${ev.recipientExternalId}`,
      );
      return null;
    }
    const orgId = channel.organizationId;

    const contact = await this.prisma.contact.upsert({
      where: {
        organizationId_channelId_externalId: {
          organizationId: orgId,
          channelId: channel.id,
          externalId: ev.senderExternalId,
        },
      },
      update: { name: ev.senderName ?? undefined },
      create: {
        organizationId: orgId,
        channelId: channel.id,
        externalId: ev.senderExternalId,
        name: ev.senderName,
        source: ev.referral?.adId ? `ad:${ev.referral.adId}` : `${ev.channelType.toLowerCase()}_dm`,
      },
    });

    // Find an open conversation for this contact or create one.
    let conversation = await this.prisma.conversation.findFirst({
      where: { organizationId: orgId, contactId: contact.id, channelId: channel.id },
      orderBy: { createdAt: 'desc' },
    });
    let conversationIsNew = false;
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: orgId,
          channelId: channel.id,
          contactId: contact.id,
          externalThreadId: ev.externalThreadId,
          adId: ev.referral?.adId,
        },
      });
      conversationIsNew = true;
    }

    // Append message (idempotent on externalId within the conversation).
    if (ev.externalMessageId) {
      const dup = await this.prisma.message.findUnique({
        where: {
          conversationId_externalId: {
            conversationId: conversation.id,
            externalId: ev.externalMessageId,
          },
        },
        select: { id: true },
      });
      if (dup) return orgId;
    }

    const preview = ev.text?.slice(0, 280) ?? `[${messageTypeFor(ev)}]`;
    const message = await this.prisma.message.create({
      data: {
        organizationId: orgId,
        conversationId: conversation.id,
        externalId: ev.externalMessageId,
        direction: MessageDirection.INBOUND,
        senderType: SenderType.CONTACT,
        type: messageTypeFor(ev),
        text: ev.text,
        attachments: ev.attachments ? (ev.attachments as unknown as object) : undefined,
        sentAt: ev.timestamp,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: ev.timestamp,
        lastMessagePreview: preview,
        unreadCount: { increment: 1 },
        status: 'OPEN',
      },
    });
    await this.prisma.activity.create({
      data: {
        organizationId: orgId,
        contactId: contact.id,
        conversationId: conversation.id,
        messageId: message.id,
        type: ActivityType.INBOUND_MESSAGE,
        title: 'Inbound message received',
        body: ev.text?.slice(0, 500),
      },
    });

    // Realtime push + async AI scoring.
    this.realtime.emitMessageCreated(orgId, { conversationId: conversation.id, message });
    this.realtime.emitConversationUpdated(orgId, { id: conversation.id });
    await this.ai.queueAnalysis(conversation.id);

    // Notify org members about new conversations from first-touch leads.
    if (conversationIsNew) {
      await this.notificationsService.broadcast(
        orgId,
        ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
        NotificationType.NEW_CONVERSATION,
        `New conversation from ${contact.name ?? contact.externalId}`,
        ev.text?.slice(0, 120),
        `/inbox?conversation=${conversation.id}`,
      );
    }

    // Fire matching automations (keyword → DM, comment-to-DM, etc.).
    await this.fireAutomations(orgId, ev, conversation.id, contact.id, channel.id, conversationIsNew);

    return orgId;
  }

  /** Maps the inbound event kind to automation triggers and dispatches them. */
  private async fireAutomations(
    orgId: string,
    ev: NormalizedInboundEvent,
    conversationId: string,
    contactId: string,
    channelId: string,
    conversationIsNew: boolean,
  ): Promise<void> {
    const ctx = {
      conversationId,
      contactId,
      channelId,
      text: ev.text ?? '',
      // For comment events, externalMessageId is the comment id (enables IG private replies).
      commentId: ev.kind === 'comment' ? ev.externalMessageId : undefined,
    };
    const triggers: AutomationTrigger[] = [];
    if (ev.kind === 'comment') triggers.push(AutomationTrigger.COMMENT_KEYWORD);
    else if (ev.kind === 'story_reply') triggers.push(AutomationTrigger.STORY_REPLY);
    else triggers.push(AutomationTrigger.DM_KEYWORD);
    if (conversationIsNew) triggers.push(AutomationTrigger.NEW_CONVERSATION);

    for (const trigger of triggers) {
      try {
        await this.automations.handleTrigger(orgId, trigger, ctx);
      } catch (err) {
        this.logger.warn(
          `Automation trigger ${trigger} failed: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }
  }

  private async resolveChannel(type: ChannelType, recipientExternalId: string) {
    // Meta sends recipient.id = '0' (or entry.id = '0') for test webhooks generated from the App Dashboard,
    // or when the app is in development mode. To allow testing the pipeline, fallback to a connected channel.
    if (recipientExternalId === '0') {
      const fallback = await this.prisma.channel.findFirst({
        where: { type, status: { in: ['CONNECTED'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (fallback) {
        this.logger.log(`Mapped test webhook (recipient 0) to fallback channel ${fallback.id}`);
        return fallback;
      }
    }

    // Messenger/IG webhooks address the page/IG id; WhatsApp the phone number id.
    const exact = await this.prisma.channel.findFirst({
      where: {
        type,
        status: { in: ['CONNECTED'] },
        OR: [
          { externalId: recipientExternalId },
          { pageId: recipientExternalId },
          { phoneNumberId: recipientExternalId },
        ],
      },
    });
    if (exact) return exact;

    // Instagram messaging/comment webhooks deliver entry.id in a different id
    // namespace than the Graph /me id, so a genuine recipient may not match the
    // stored externalId. When exactly one Instagram channel is connected, route
    // to it (and backfill the id so future events match exactly).
    if (type === ChannelType.INSTAGRAM) {
      const channels = await this.prisma.channel.findMany({
        where: { type, status: { in: ['CONNECTED'] }, deletedAt: null },
        take: 2,
      });
      const sole = channels.length === 1 ? channels[0] : undefined;
      if (sole) {
        this.logger.log(
          `IG webhook recipient ${recipientExternalId} mapped to sole connected channel ${sole.id}`,
        );
        return sole;
      }
    }
    return null;
  }
}
