import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queue.constants';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { aiServiceProvider } from './ai.provider';
import { AiOrchestratorService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { AiController } from './ai.controller';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.AI }), RealtimeModule, NotificationsModule],
  controllers: [AiController],
  providers: [aiServiceProvider, AiOrchestratorService, AiProcessor],
  exports: [AiOrchestratorService],
})
export class AiModule {}
