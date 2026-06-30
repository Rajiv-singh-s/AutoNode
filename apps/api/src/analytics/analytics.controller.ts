import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { OrgId } from '../auth/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard headline metrics for the organization' })
  overview(@OrgId() orgId: string) {
    return this.analytics.overview(orgId);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Conversations and leads created per day' })
  timeseries(@OrgId() orgId: string, @Query('days') days?: string) {
    const n = Math.min(Math.max(Number(days) || 14, 1), 90);
    return this.analytics.timeseries(orgId, n);
  }
}
