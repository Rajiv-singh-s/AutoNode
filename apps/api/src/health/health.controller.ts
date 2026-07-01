import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queue/queue.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + DB readiness probe' })
  async check(): Promise<{
    status: 'ok' | 'degraded';
    db: 'up' | 'down';
    redis: 'up' | 'down';
    queues: { webhook: number; ai: number };
    uptimeSec: number;
    ts: string;
  }> {
    let db: 'up' | 'down' = 'up';
    let redis: 'up' | 'down' = 'up';
    let queues = { webhook: -1, ai: -1 };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    try {
      const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
      const u = new URL(redisUrl);
      const isUpstash = u.hostname.includes('upstash.io');
      const connection = {
        host: u.hostname,
        port: Number(u.port || 6379),
        ...(u.password ? { password: u.password } : {}),
        ...(u.username ? { username: u.username } : {}),
        ...(u.protocol === 'rediss:' || isUpstash ? { tls: {} } : {}),
        family: 0,
      };

      const webhookQueue = new Queue(QUEUES.WEBHOOK, { connection });
      const aiQueue = new Queue(QUEUES.AI, { connection });
      try {
        await webhookQueue.waitUntilReady();
        await aiQueue.waitUntilReady();

        const webhookCounts = await webhookQueue.getJobCounts(
          'waiting',
          'active',
          'delayed',
          'prioritized',
        );
        const aiCounts = await aiQueue.getJobCounts(
          'waiting',
          'active',
          'delayed',
          'prioritized',
        );

        queues = {
          webhook:
            (webhookCounts.waiting ?? 0) +
            (webhookCounts.active ?? 0) +
            (webhookCounts.delayed ?? 0) +
            (webhookCounts.prioritized ?? 0),
          ai:
            (aiCounts.waiting ?? 0) +
            (aiCounts.active ?? 0) +
            (aiCounts.delayed ?? 0) +
            (aiCounts.prioritized ?? 0),
        };
      } finally {
        await webhookQueue.close();
        await aiQueue.close();
      }
    } catch {
      redis = 'down';
    }

    return {
      status: db === 'up' && redis === 'up' ? 'ok' : 'degraded',
      db,
      redis,
      queues,
      uptimeSec: Math.floor(process.uptime()),
      ts: new Date().toISOString(),
    };
  }
}
