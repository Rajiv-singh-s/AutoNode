import {
  Controller,
  Get,
  Logger,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChannelType } from '@autonode/database';
import { Public } from '../../auth/public.decorator';
import { OrgId } from '../../auth/current-user.decorator';
import { MetaOAuthService } from './meta-oauth.service';

@ApiTags('meta-oauth')
@Controller('integrations/meta')
export class MetaOAuthController {
  private readonly logger = new Logger(MetaOAuthController.name);

  constructor(private readonly oauth: MetaOAuthService) {}

  /**
   * Initiates the Meta OAuth flow.
   * Authenticated: requires JWT. Returns the OAuth URL as JSON so the
   * frontend can open it (avoids cookie/CORS issues with server-side redirect).
   */
  @Get('oauth/initiate')
  @ApiOperation({ summary: 'Get Meta OAuth authorization URL' })
  @ApiQuery({ name: 'channelType', enum: ChannelType })
  initiateOAuth(
    @OrgId() orgId: string,
    @Query('channelType') channelType: ChannelType,
  ) {
    const url = this.oauth.buildAuthUrl(orgId, channelType ?? ChannelType.INSTAGRAM);
    return { url };
  }

  /**
   * Handles the Meta OAuth callback redirect.
   * Public: Meta redirects here without JWT. Uses signed state for auth.
   * On completion, redirects the browser to the frontend settings page.
   */
  @Get('oauth/callback')
  @Public()
  @ApiOperation({ summary: 'Meta OAuth callback (server-side redirect)' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_reason') errorReason: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    // Instagram appends error / error_reason / error_description when the user
    // denies access or the app/redirect is misconfigured. Surface it clearly.
    if (error) {
      this.logger.warn(
        `Instagram OAuth denied/failed: error=${error} reason=${errorReason} description=${errorDescription}`,
      );
      const reason = errorReason === 'user_denied' ? 'denied' : 'oauth_failed';
      const redirectUrl = await this.oauth.errorRedirect(state ?? '', reason);
      res.redirect(redirectUrl);
      return;
    }

    if (!code) {
      this.logger.warn('Instagram OAuth callback hit without a code or error param');
      res.redirect(await this.oauth.errorRedirect(state ?? '', 'oauth_failed'));
      return;
    }

    const redirectUrl = await this.oauth.handleCallback(code, state);
    res.redirect(redirectUrl);
  }
}
