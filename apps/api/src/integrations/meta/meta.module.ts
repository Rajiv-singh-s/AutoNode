import { Module } from '@nestjs/common';
import { MetaGraphService } from './meta-graph.service';
import { MetaOAuthService } from './meta-oauth.service';
import { MetaOAuthController } from './meta-oauth.controller';
import { BillingModule } from '../../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [MetaOAuthController],
  providers: [MetaGraphService, MetaOAuthService],
  exports: [MetaGraphService, MetaOAuthService],
})
export class MetaModule {}
