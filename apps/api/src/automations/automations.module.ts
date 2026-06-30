import { Module } from '@nestjs/common';
import { MetaModule } from '../integrations/meta/meta.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BillingModule } from '../billing/billing.module';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';

@Module({
  imports: [MetaModule, RealtimeModule, BillingModule],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
