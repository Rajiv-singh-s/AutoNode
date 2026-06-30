import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChannelType, WebhookEventStatus } from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_JOB_OPTS, QUEUES, WEBHOOK_JOBS } from '../queue/queue.constants';
import type { MetaWebhookBody } from '../integrations/meta/meta.types';

function sourceFor(object: string): ChannelType {
  if (object === 'instagram') return ChannelType.INSTAGRAM;
  if (object === 'whatsapp_business_account') return ChannelType.WHATSAPP;
  return ChannelType.MESSENGER;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.WEBHOOK) private readonly queue: Queue,
  ) {}

  /** Persist a valid event and enqueue processing. Idempotent on dedupeKey. */
  async ingest(body: MetaWebhookBody, signatureValid: boolean): Promise<void> {
    const dedupeKey = this.computeDedupeKey(body);

    // Idempotency: ignore duplicate deliveries Meta may retry.
    if (dedupeKey) {
      const existing = await this.prisma.webhookEvent.findUnique({
        where: { dedupeKey },
        select: { id: true },
      });
      if (existing) {
        this.logger.debug(`Duplicate webhook ${dedupeKey} ignored`);
        return;
      }
    }

    const event = await this.prisma.webhookEvent.create({
      data: {
        source: sourceFor(body.object),
        dedupeKey,
        signatureValid,
        status: WebhookEventStatus.RECEIVED,
        payload: body as unknown as object,
      },
    });

    await this.queue.add(
      WEBHOOK_JOBS.PROCESS_EVENT,
      { webhookEventId: event.id },
      // BullMQ forbids ':' in custom job IDs; the cuid is already unique.
      { ...DEFAULT_JOB_OPTS, jobId: `webhook_${event.id}` },
    );
  }

  /** Store an event we refused to process (bad signature) for audit. */
  async recordRejected(body: unknown): Promise<void> {
    await this.prisma.webhookEvent.create({
      data: {
        source: ChannelType.MESSENGER,
        signatureValid: false,
        status: WebhookEventStatus.SKIPPED,
        payload: (body ?? {}) as object,
        error: 'Invalid X-Hub-Signature-256',
      },
    });
  }

  private computeDedupeKey(body: MetaWebhookBody): string | null {
    // Prefer a message id when present; fall back to entry id + time.
    const entry = body.entry?.[0];
    const mid = entry?.messaging?.[0]?.message?.mid;
    if (mid) return `mid:${mid}`;
    if (entry?.id && entry.time) return `entry:${entry.id}:${entry.time}`;
    return null;
  }
}
