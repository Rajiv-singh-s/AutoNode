import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service';
import { OrgId } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

class CreateCheckoutDto {
  @ApiProperty({ enum: ['pro', 'enterprise'] })
  @IsEnum(['pro', 'enterprise'])
  plan!: 'pro' | 'enterprise';
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription status' })
  getSubscription(@OrgId() orgId: string) {
    return this.billing.getSubscription(orgId);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing history events for the organization' })
  history(@OrgId() orgId: string) {
    return this.billing.getHistory(orgId);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a Stripe Checkout session to upgrade/subscribe' })
  createCheckout(@OrgId() orgId: string, @Body() dto: CreateCheckoutDto) {
    return this.billing.createCheckoutSession(orgId, dto.plan);
  }

  @Post('portal')
  @ApiBearerAuth()
  @Roles('OWNER')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe Billing Portal session' })
  createPortal(@OrgId() orgId: string) {
    return this.billing.createPortalSession(orgId);
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint (no auth, verified by signature)' })
  async webhook(@Req() req: RawBodyRequest<Request>) {
    await this.billing.handleWebhook(req);
    return { received: true };
  }
}
