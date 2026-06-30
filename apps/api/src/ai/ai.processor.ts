import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationType } from '@autonode/database';
import { AI_JOBS, QUEUES } from '../queue/queue.constants';
import { AiOrchestratorService } from './ai.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

interface AnalyzeJobData {
  conversationId: string;
}

/** BullMQ worker for the AI queue. Failed jobs exhaust retries then dead-letter. */
@Processor(QUEUES.AI)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<AnalyzeJobData>): Promise<void> {
    if (job.name !== AI_JOBS.ANALYZE_CONVERSATION) return;
    const { conversationId } = job.data;
    const result = await this.orchestrator.runAnalysis(conversationId);
    if (result) {
      this.realtime.emitAiAnalysisReady(result.orgId, { conversationId });
      this.logger.debug(`AI analysis complete for ${conversationId}`);

      // Fire a hot-lead notification when leadScore hits 70+ for the first time.
      if (result.leadScore != null && result.leadScore >= 70 && result.contactName) {
        await this.notifications.broadcast(
          result.orgId,
          ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
          NotificationType.NEW_HOT_LEAD,
          `Hot lead: ${result.contactName}`,
          `Lead score ${result.leadScore}/100 — high buying intent detected`,
          `/inbox?conversation=${conversationId}`,
        );
      }
    }
  }
}
