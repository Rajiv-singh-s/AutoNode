import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiService as CoreAiService, type ConversationTurn } from '@autonode/ai';
import { MessageDirection } from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { AI_SERVICE } from './ai.provider';
import { AI_JOBS, DEFAULT_JOB_OPTS, QUEUES } from '../queue/queue.constants';

@Injectable()
export class AiOrchestratorService {
  constructor(
    @Inject(AI_SERVICE) private readonly ai: CoreAiService,
    @InjectQueue(QUEUES.AI) private readonly aiQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /** Enqueue (debounced by jobId) a full analysis of a conversation. */
  async queueAnalysis(conversationId: string): Promise<void> {
    await this.aiQueue.add(
      AI_JOBS.ANALYZE_CONVERSATION,
      { conversationId },
      // BullMQ forbids ':' in custom job IDs; underscore keeps it debounced.
      { ...DEFAULT_JOB_OPTS, jobId: `analyze_${conversationId}` },
    );
  }

  /** On-demand reply suggestions for the assistant panel. */
  async suggestReplies(conversationId: string, instruction?: string): Promise<string[]> {
    const turns = await this.loadTurns(conversationId);
    return this.ai.suggestReplies(turns, instruction);
  }

  /** Runs the model and persists derived signals. Called by the queue worker. */
  async runAnalysis(conversationId: string): Promise<{ orgId: string; leadScore: number; contactName: string | null } | null> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, organizationId: true, contactId: true },
    });
    if (!convo) return null;

    const turns = await this.loadTurns(conversationId);
    if (turns.length === 0) return { orgId: convo.organizationId, leadScore: 0, contactName: null };

    const analysis = await this.ai.analyzeConversation(turns);

    const [, contact] = await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          aiSummary: analysis.summary,
          sentiment: analysis.sentiment,
          buyingIntent: analysis.buyingIntent,
          priorityScore: analysis.priorityScore,
          isSpam: analysis.isSpam,
          language: analysis.language,
          aiSuggestedReplies: analysis.suggestedReplies,
          status: analysis.isSpam ? 'SPAM' : undefined,
        },
      }),
      this.prisma.contact.update({
        where: { id: convo.contactId },
        data: { leadScore: analysis.leadScore },
        select: { name: true },
      }),
    ]);

    return { orgId: convo.organizationId, leadScore: analysis.leadScore, contactName: contact.name };
  }

  private async loadTurns(conversationId: string): Promise<ConversationTurn[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, type: { in: ['TEXT', 'COMMENT', 'STORY_REPLY'] } },
      orderBy: { sentAt: 'asc' },
      take: 50,
      select: { text: true, direction: true },
    });
    return messages
      .filter((m): m is { text: string; direction: MessageDirection } => Boolean(m.text))
      .map((m) => ({
        role: m.direction === MessageDirection.INBOUND ? 'contact' : 'agent',
        text: m.text,
      }));
  }
}
