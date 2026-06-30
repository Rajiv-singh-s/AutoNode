import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { ChannelType } from '@autonode/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto.service';
import { BillingService } from '../../billing/billing.service';

interface OAuthState {
  orgId: string;
  channelType: ChannelType;
  exp: number; // unix ms
}

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
}

interface PageListResponse {
  data: MetaPage[];
}

interface ResolvedChannelTarget {
  channelType: ChannelType;
  externalId: string;
}

// ── Instagram API with Instagram Login response shapes ──────────────────────

interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
  permissions?: string[];
}

interface InstagramLongLivedResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds (~60 days)
}

interface InstagramAccount {
  user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

@Injectable()
export class MetaOAuthService {
  private readonly logger = new Logger(MetaOAuthService.name);

  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly graphVersion: string;
  private readonly appUrl: string;
  private readonly hmacKey: string;
  // Instagram API with Instagram Login uses its own app credentials + hosts.
  private readonly igAppId: string;
  private readonly igAppSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly billing: BillingService,
  ) {
    this.appId = this.config.get<string>('META_APP_ID', '');
    this.appSecret = this.config.get<string>('META_APP_SECRET', '');
    this.redirectUri = this.config.get<string>('META_OAUTH_REDIRECT_URI', '');
    this.graphVersion = this.config.get<string>('META_GRAPH_VERSION', 'v21.0');
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    // Use encryption key as HMAC key for state signing
    this.hmacKey = this.config.get<string>('ENCRYPTION_KEY', '');
    this.igAppId = this.config.get<string>('INSTAGRAM_APP_ID', '');
    this.igAppSecret = this.config.get<string>('INSTAGRAM_APP_SECRET', '');
  }

  private baseUrl(): string {
    return `https://graph.facebook.com/${this.graphVersion}`;
  }

  /** Instagram Graph host for the Instagram-Login API (tokens, account, messaging). */
  private igGraphUrl(): string {
    return `https://graph.instagram.com/${this.graphVersion}`;
  }

  // ── State token helpers ────────────────────────────────────────────────────

  private signState(state: OAuthState): string {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    const sig = createHmac('sha256', this.hmacKey).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private verifyState(token: string): OAuthState {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) throw new BadRequestException('Invalid OAuth state');

    const expected = createHmac('sha256', this.hmacKey).update(payload).digest('base64url');
    if (expected !== sig) throw new BadRequestException('OAuth state signature invalid');

    let state: OAuthState;
    try {
      state = JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch {
      throw new BadRequestException('OAuth state payload malformed');
    }
    if (Date.now() > state.exp) throw new BadRequestException('OAuth state expired');
    return state;
  }

  // ── Scope selection ────────────────────────────────────────────────────────

  private scopesFor(channelType: ChannelType): string {
    switch (channelType) {
      case ChannelType.INSTAGRAM:
        return [
          'instagram_basic',
          'instagram_manage_messages',
          'pages_show_list',
          'pages_manage_metadata',
          'pages_read_engagement',
        ].join(',');
      case ChannelType.MESSENGER:
        return [
          'pages_messaging',
          'pages_show_list',
          'pages_manage_metadata',
        ].join(',');
      case ChannelType.WHATSAPP:
        return [
          'whatsapp_business_management',
          'whatsapp_business_messaging',
          'pages_show_list',
        ].join(',');
      default:
        return 'pages_show_list,pages_manage_metadata';
    }
  }

  private assertOAuthConfig(): void {
    if (!this.appId || !/^\d+$/.test(this.appId)) {
      throw new BadRequestException(
        'META_APP_ID is missing or invalid. Set a valid numeric Meta App ID in the API environment.',
      );
    }
    if (!this.appSecret) {
      throw new BadRequestException(
        'META_APP_SECRET is missing. Set your Meta App Secret in the API environment.',
      );
    }
    if (!this.redirectUri) {
      throw new BadRequestException(
        'META_OAUTH_REDIRECT_URI is missing. Set it to your backend callback URL.',
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(this.redirectUri);
    } catch {
      throw new BadRequestException(
        'META_OAUTH_REDIRECT_URI is invalid. It must be an absolute URL.',
      );
    }
    if (!parsed.pathname.endsWith('/integrations/meta/oauth/callback')) {
      throw new BadRequestException(
        'META_OAUTH_REDIRECT_URI must point to /integrations/meta/oauth/callback.',
      );
    }
  }

  // ── Initiate ───────────────────────────────────────────────────────────────

  /**
   * Builds the Meta OAuth dialog URL and returns it. The caller (controller)
   * redirects the browser there.
   */
  buildAuthUrl(orgId: string, channelType: ChannelType): string {
    const state = this.signState({
      orgId,
      channelType,
      exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Instagram uses the official Instagram API with Instagram Login — the
    // login experience happens on instagram.com, no Facebook Page required.
    if (channelType === ChannelType.INSTAGRAM) {
      return this.buildInstagramAuthUrl(state);
    }

    // Messenger / WhatsApp continue to use Facebook Login (Business Login).
    this.assertOAuthConfig();
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: this.scopesFor(channelType),
      state,
      response_type: 'code',
    });

    return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
  }

  /** Builds the Instagram-Login authorization URL (instagram.com). */
  private buildInstagramAuthUrl(state: string): string {
    this.assertInstagramConfig();
    const params = new URLSearchParams({
      client_id: this.igAppId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.instagramScopes(),
      state,
      // Force the Instagram login screen (not Facebook) and re-auth each time.
      enable_fb_login: '0',
      force_authentication: '1',
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /** Scopes for the Instagram API with Instagram Login (business_* scopes). */
  private instagramScopes(): string {
    return [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
    ].join(',');
  }

  // ── Callback ───────────────────────────────────────────────────────────────

  /**
   * Handles the OAuth callback:
   * 1. Validates state
   * 2. Exchanges code for a short-lived user token
   * 3. Exchanges for long-lived page tokens
   * 4. Gets all connected pages (and linked Instagram accounts)
   * 5. Subscribes each page to webhooks
   * 6. Upserts Channel records
   * Returns the redirect URL for the frontend.
   */
  /** Builds the frontend settings redirect URL carrying an error code. */
  errorRedirect(_rawState: string, code: string): string {
    return `${this.appUrl}/settings/channels?error=${encodeURIComponent(code)}`;
  }

  async handleCallback(code: string, rawState: string): Promise<string> {
    const frontendSettingsUrl = `${this.appUrl}/settings/channels`;

    let state: OAuthState;
    try {
      state = this.verifyState(rawState);
    } catch (err) {
      this.logger.warn('Meta OAuth state verification failed', err);
      return `${frontendSettingsUrl}?error=invalid_state`;
    }

    // Instagram uses the dedicated Instagram-Login callback flow.
    if (state.channelType === ChannelType.INSTAGRAM) {
      return this.handleInstagramCallback(code, state, frontendSettingsUrl);
    }

    try {
      // Step 1: Short-lived user token
      const shortToken = await this.exchangeCodeForToken(code);

      // Step 2: Long-lived user token
      const longToken = await this.exchangeForLongLivedToken(shortToken);

      // Step 3: Get connected pages with their page-level tokens
      const pages = await this.getPages(longToken);
      if (pages.length === 0) {
        this.logger.warn('No pages found for Meta OAuth, orgId=%s', state.orgId);
        return `${frontendSettingsUrl}?error=no_pages`;
      }

      const targets = this.collectUniqueTargets(pages, state.channelType);
      await this.enforceChannelCapacity(state.orgId, targets);

      // Step 4: For each page, subscribe webhooks + upsert channel
      for (const page of pages) {
        await this.upsertChannelForPage(page, state, longToken);
      }

      return `${frontendSettingsUrl}?success=1`;
    } catch (err) {
      this.logger.error('Meta OAuth callback error', err);
      return `${frontendSettingsUrl}?error=oauth_failed`;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Instagram API with Instagram Login
  // ════════════════════════════════════════════════════════════════════════

  private assertInstagramConfig(): void {
    if (!this.igAppId || !/^\d+$/.test(this.igAppId)) {
      throw new BadRequestException(
        'INSTAGRAM_APP_ID is missing or invalid. Set the numeric Instagram app ID (Meta App → Instagram → API setup with Instagram login).',
      );
    }
    if (!this.igAppSecret) {
      throw new BadRequestException(
        'INSTAGRAM_APP_SECRET is missing. Set your Instagram app secret in the API environment.',
      );
    }
    if (!this.redirectUri) {
      throw new BadRequestException(
        'META_OAUTH_REDIRECT_URI is missing. Set it to your backend callback URL and add it to the Instagram app OAuth redirect URIs.',
      );
    }
  }

  /**
   * Instagram-Login callback:
   * 1. Exchange code → short-lived IG user token (+ user_id) via api.instagram.com
   * 2. Exchange → long-lived token (60 days) via graph.instagram.com
   * 3. Fetch the Instagram professional account (id, username)
   * 4. Subscribe the account to messaging/comments webhooks
   * 5. Upsert the Channel with the encrypted long-lived token
   */
  private async handleInstagramCallback(
    code: string,
    state: OAuthState,
    frontendSettingsUrl: string,
  ): Promise<string> {
    try {
      const short = await this.exchangeInstagramCode(code);
      const long = await this.exchangeForLongLivedIgToken(short.access_token);
      const account = await this.getInstagramAccount(long.access_token);

      // One Instagram account == one channel; enforce plan capacity if new.
      await this.enforceChannelCapacity(state.orgId, [
        { channelType: ChannelType.INSTAGRAM, externalId: account.user_id },
      ]);

      await this.subscribeInstagramWebhooks(long.access_token);
      await this.upsertInstagramChannel(state.orgId, account, long);

      return `${frontendSettingsUrl}?success=1`;
    } catch (err) {
      this.logger.error('Instagram OAuth callback error', err);
      return `${frontendSettingsUrl}?error=oauth_failed`;
    }
  }

  /** Step 1 — exchange the authorization code for a short-lived IG token. */
  private async exchangeInstagramCode(code: string): Promise<InstagramTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.igAppId,
      client_secret: this.igAppSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });
    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new Error(`Instagram code exchange failed: ${await res.text()}`);
    }
    return (await res.json()) as InstagramTokenResponse;
  }

  /** Step 2 — exchange the short-lived token for a 60-day long-lived token. */
  private async exchangeForLongLivedIgToken(
    shortToken: string,
  ): Promise<InstagramLongLivedResponse> {
    const url = new URL('https://graph.instagram.com/access_token');
    url.searchParams.set('grant_type', 'ig_exchange_token');
    url.searchParams.set('client_secret', this.igAppSecret);
    url.searchParams.set('access_token', shortToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Instagram long-lived token exchange failed: ${await res.text()}`);
    }
    return (await res.json()) as InstagramLongLivedResponse;
  }

  /** Step 3 — fetch the connected Instagram professional account. */
  private async getInstagramAccount(token: string): Promise<InstagramAccount> {
    const url = new URL(`${this.igGraphUrl()}/me`);
    url.searchParams.set('fields', 'user_id,username,name,profile_picture_url');
    url.searchParams.set('access_token', token);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Fetching Instagram account failed: ${await res.text()}`);
    }
    const data = (await res.json()) as Partial<InstagramAccount> & { id?: string };
    // `user_id` is the IG-scoped business id used in webhooks; fall back to `id`.
    const userId = data.user_id ?? data.id;
    if (!userId) throw new Error('Instagram account response missing user_id');
    return {
      user_id: String(userId),
      username: data.username ?? '',
      name: data.name,
      profile_picture_url: data.profile_picture_url,
    };
  }

  /** Step 4 — enable messaging + comments webhooks for the Instagram account. */
  private async subscribeInstagramWebhooks(token: string): Promise<void> {
    const url = `${this.igGraphUrl()}/me/subscribed_apps`;
    const body = new URLSearchParams({
      subscribed_fields: 'messages,message_reactions,comments,live_comments',
      access_token: token,
    });
    const res = await fetch(url, { method: 'POST', body });
    if (!res.ok) {
      // Non-fatal: log and continue so the channel still connects.
      this.logger.warn('Failed to subscribe Instagram webhooks: %s', await res.text());
    }
  }

  /** Step 5 — persist the Instagram channel with its encrypted long-lived token. */
  private async upsertInstagramChannel(
    orgId: string,
    account: InstagramAccount,
    token: InstagramLongLivedResponse,
  ): Promise<void> {
    const encryptedToken = this.crypto.encrypt(token.access_token);
    const tokenExpiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : null;

    await this.prisma.channel.upsert({
      where: {
        organizationId_type_externalId: {
          organizationId: orgId,
          type: ChannelType.INSTAGRAM,
          externalId: account.user_id,
        },
      },
      create: {
        organizationId: orgId,
        type: ChannelType.INSTAGRAM,
        name: account.name ?? account.username,
        username: account.username,
        avatarUrl: account.profile_picture_url ?? null,
        externalId: account.user_id,
        pageId: null, // Instagram Login has no Facebook Page
        accessTokenEnc: encryptedToken,
        tokenExpiresAt,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
      update: {
        name: account.name ?? account.username,
        username: account.username,
        avatarUrl: account.profile_picture_url ?? null,
        pageId: null,
        accessTokenEnc: encryptedToken,
        tokenExpiresAt,
        status: 'CONNECTED',
        deletedAt: null,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      'Connected Instagram account @%s (%s) for org %s',
      account.username,
      account.user_id,
      orgId,
    );
  }

  // ── Token exchange ─────────────────────────────────────────────────────────

  private async exchangeCodeForToken(code: string): Promise<string> {
    const url = new URL(`${this.baseUrl()}/oauth/access_token`);
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('client_secret', this.appSecret);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('code', code);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Code exchange failed: ${body}`);
    }
    const data = (await res.json()) as LongLivedTokenResponse;
    return data.access_token;
  }

  private async exchangeForLongLivedToken(shortToken: string): Promise<string> {
    const url = new URL(`${this.baseUrl()}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('client_secret', this.appSecret);
    url.searchParams.set('fb_exchange_token', shortToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Long-lived token exchange failed: ${body}`);
    }
    const data = (await res.json()) as LongLivedTokenResponse;
    return data.access_token;
  }

  private async getPages(userToken: string): Promise<MetaPage[]> {
    const url = new URL(`${this.baseUrl()}/me/accounts`);
    url.searchParams.set('access_token', userToken);
    url.searchParams.set(
      'fields',
      'id,name,access_token,instagram_business_account{id}',
    );

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Fetching pages failed: ${body}`);
    }
    const data = (await res.json()) as PageListResponse;
    return data.data ?? [];
  }

  // ── Webhook subscription ───────────────────────────────────────────────────

  private async subscribePageToWebhooks(pageId: string, pageToken: string): Promise<void> {
    const url = `${this.baseUrl()}/${pageId}/subscribed_apps`;
    const body = new URLSearchParams({
      subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_reads',
      access_token: pageToken,
    });

    const res = await fetch(url, { method: 'POST', body });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn('Failed to subscribe page %s to webhooks: %s', pageId, text);
      // Non-fatal — log and continue
    }
  }

  // ── Channel upsert ─────────────────────────────────────────────────────────

  private async upsertChannelForPage(
    page: MetaPage,
    state: OAuthState,
    _userToken: string,
  ): Promise<void> {
    await this.subscribePageToWebhooks(page.id, page.access_token);

    const encryptedToken = this.crypto.encrypt(page.access_token);

    const target = this.resolveChannelTarget(page, state.channelType);

    await this.prisma.channel.upsert({
      where: {
        organizationId_type_externalId: {
          organizationId: state.orgId,
          type: target.channelType,
          externalId: target.externalId,
        },
      },
      create: {
        organizationId: state.orgId,
        type: target.channelType,
        name: page.name,
        externalId: target.externalId,
        pageId: page.id,
        accessTokenEnc: encryptedToken,
        status: 'CONNECTED',
      },
      update: {
        name: page.name,
        pageId: page.id,
        accessTokenEnc: encryptedToken,
        status: 'CONNECTED',
        deletedAt: null,
        lastError: null,
      },
    });

    this.logger.log(
      'Upserted channel %s (%s) for org %s',
      page.name,
      target.channelType,
      state.orgId,
    );
  }

  private resolveChannelTarget(page: MetaPage, channelType: ChannelType): ResolvedChannelTarget {
    if (channelType === ChannelType.INSTAGRAM && page.instagram_business_account?.id) {
      return { channelType, externalId: page.instagram_business_account.id };
    }
    return { channelType, externalId: page.id };
  }

  private collectUniqueTargets(
    pages: MetaPage[],
    channelType: ChannelType,
  ): ResolvedChannelTarget[] {
    const byKey = new Map<string, ResolvedChannelTarget>();
    for (const page of pages) {
      const target = this.resolveChannelTarget(page, channelType);
      byKey.set(`${target.channelType}:${target.externalId}`, target);
    }
    return Array.from(byKey.values());
  }

  private async enforceChannelCapacity(
    orgId: string,
    targets: ResolvedChannelTarget[],
  ): Promise<void> {
    if (targets.length === 0) return;

    const existing = await this.prisma.channel.findMany({
      where: {
        organizationId: orgId,
        OR: targets.map((t) => ({ type: t.channelType, externalId: t.externalId })),
      },
      select: { type: true, externalId: true, deletedAt: true },
    });
    const existingByKey = new Map(
      existing.map((c) => [`${c.type}:${c.externalId}`, c.deletedAt == null]),
    );
    const required = targets.filter((t) => !existingByKey.get(`${t.channelType}:${t.externalId}`)).length;
    if (required > 0) {
      await this.billing.enforceLimit(orgId, 'channels', required);
    }
  }
}
