import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';

import { loadConfiguration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { OrgThrottlerGuard } from './common/org-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.decorator';
import { RealtimeModule } from './realtime/realtime.module';
import { AiModule } from './ai/ai.module';
import { MetaModule } from './integrations/meta/meta.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { InboxModule } from './inbox/inbox.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContactsModule } from './contacts/contacts.module';
import { AutomationsModule } from './automations/automations.module';
import { ChannelsModule } from './channels/channels.module';
import { TeamModule } from './team/team.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BillingModule } from './billing/billing.module';
import { HealthController } from './health/health.controller';

function redisConnectionFromUrl(url: string) {
  const u = new URL(url);
  const isUpstash = u.hostname.includes('upstash.io');
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    ...(u.password ? { password: u.password } : {}),
    ...(u.username ? { username: u.username } : {}),
    ...(u.protocol === 'rediss:' || isUpstash ? { tls: {} } : {}),
    family: 0,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), 'apps', 'api', '.env'),
        join(__dirname, '..', '.env'),
        join(process.cwd(), '.env'),
      ],
      validate: loadConfiguration,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: redisConnectionFromUrl(process.env.REDIS_URL ?? 'redis://localhost:6379'),
      }),
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    RealtimeModule,
    MetaModule,
    AiModule,
    WebhooksModule,
    InboxModule,
    AnalyticsModule,
    ContactsModule,
    AutomationsModule,
    ChannelsModule,
    TeamModule,
    SettingsModule,
    NotificationsModule,
    BillingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: OrgThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
