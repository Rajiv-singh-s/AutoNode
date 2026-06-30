import { Module } from '@nestjs/common';
import { MetaModule } from '../integrations/meta/meta.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [MetaModule, RealtimeModule],
  controllers: [InboxController],
  providers: [InboxService],
})
export class InboxModule {}
