import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelType } from '@autonode/database';
import { CryptoService } from '../../common/crypto.service';

/**
 * Thin client over the Meta Graph API for OUTBOUND messages. Uses only
 * official endpoints. The channel's access token is decrypted just-in-time
 * and never logged.
 */
@Injectable()
export class MetaGraphService {
  private readonly logger = new Logger(MetaGraphService.name);
  private readonly version: string;

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {
    this.version = this.config.get<string>('META_GRAPH_VERSION', 'v21.0');
  }

  private baseUrl(): string {
    return `https://graph.facebook.com/${this.version}`;
  }

  /** Instagram Graph host — used by the Instagram API with Instagram Login. */
  private igBaseUrl(): string {
    return `https://graph.instagram.com/${this.version}`;
  }

  private token(channel: Channel): string {
    if (!channel.accessTokenEnc) {
      throw new BadGatewayException('Channel has no access token configured');
    }
    return this.crypto.decrypt(channel.accessTokenEnc);
  }

  /** Sends a text message to a contact on the given channel. Returns Meta's message id. */
  async sendText(channel: Channel, recipientExternalId: string, text: string): Promise<string> {
    switch (channel.type) {
      case ChannelType.INSTAGRAM:
        return this.sendInstagram(channel, recipientExternalId, text);
      case ChannelType.MESSENGER:
        return this.sendMessengerStyle(channel, recipientExternalId, text);
      case ChannelType.WHATSAPP:
        return this.sendWhatsApp(channel, recipientExternalId, text);
      default:
        throw new BadGatewayException(`Unsupported channel type ${channel.type}`);
    }
  }

  /**
   * Instagram API with Instagram Login: send via graph.instagram.com using the
   * account's own token (no Facebook Page involved). Recipient is the IGSID.
   */
  private async sendInstagram(
    channel: Channel,
    recipientId: string,
    text: string,
  ): Promise<string> {
    const res = await this.post(`${this.igBaseUrl()}/me/messages`, this.token(channel), {
      recipient: { id: recipientId },
      message: { text },
    });
    return (res as { message_id?: string }).message_id ?? '';
  }

  /**
   * Instagram private reply to a comment. This is the sanctioned way to DM a
   * user who commented (a cold DM to their IGSID is blocked). Must be sent
   * within 7 days of the comment, once per comment.
   */
  async sendInstagramCommentReply(
    channel: Channel,
    commentId: string,
    text: string,
  ): Promise<string> {
    const res = await this.post(`${this.igBaseUrl()}/me/messages`, this.token(channel), {
      recipient: { comment_id: commentId },
      message: { text },
    });
    return (res as { message_id?: string }).message_id ?? '';
  }

  /** Messenger uses the Facebook Graph /me/messages send API with a Page token. */
  private async sendMessengerStyle(
    channel: Channel,
    recipientId: string,
    text: string,
  ): Promise<string> {
    const senderId = channel.pageId ?? channel.externalId;
    const res = await this.post(`${this.baseUrl()}/${senderId}/messages`, this.token(channel), {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text },
    });
    return (res as { message_id?: string }).message_id ?? '';
  }

  private async sendWhatsApp(channel: Channel, toPhone: string, text: string): Promise<string> {
    if (!channel.phoneNumberId) {
      throw new BadGatewayException('WhatsApp channel missing phoneNumberId');
    }
    const res = await this.post(
      `${this.baseUrl()}/${channel.phoneNumberId}/messages`,
      this.token(channel),
      {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: text },
      },
    );
    const messages = (res as { messages?: { id: string }[] }).messages;
    return messages?.[0]?.id ?? '';
  }

  private async post(url: string, token: string, body: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.error(`Meta Graph error ${res.status}: ${JSON.stringify(json.error ?? json)}`);
      throw new BadGatewayException('Meta Graph API request failed');
    }
    return json;
  }
}
