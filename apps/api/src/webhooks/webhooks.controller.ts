import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { CryptoService } from '../common/crypto.service';
import { WebhooksService } from './webhooks.service';

/**
 * Meta webhook endpoint. One controller serves Instagram, Messenger and
 * WhatsApp because Meta posts all three to the same callback URL.
 *
 *  GET  — subscription verification handshake (hub.challenge echo)
 *  POST — event delivery; we verify the HMAC signature, persist the raw
 *         event for idempotency/audit, enqueue async processing, and 200 fast.
 */
@Public()
@ApiExcludeController()
@Controller('webhooks/meta')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly webhooks: WebhooksService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expected = this.config.get<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Forbidden');
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string | undefined,
  ): Promise<{ received: true }> {
    const appSecret = this.config.get<string>('META_APP_SECRET', '');
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const valid = this.crypto.verifyMetaSignature(raw, signature, appSecret);

    if (!valid && appSecret) {
      // Record the rejected event for audit but never process it.
      this.logger.warn('Rejected Meta webhook with invalid signature');
      await this.webhooks.recordRejected(req.body);
      return { received: true };
    }

    await this.webhooks.ingest(req.body, valid);
    return { received: true };
  }
}
