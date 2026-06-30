import { ChannelType } from '@autonode/database';

/**
 * Normalized inbound event derived from any Meta webhook payload
 * (Instagram, Messenger, or WhatsApp), so downstream processing is uniform.
 */
export interface NormalizedInboundEvent {
  channelType: ChannelType;
  /** Identifies which connected Channel this belongs to (IG id / page id / phone number id). */
  recipientExternalId: string;
  /** The contact's per-channel id (IGSID / PSID / WA phone). */
  senderExternalId: string;
  senderName?: string;
  externalMessageId?: string;
  externalThreadId?: string;
  kind: 'message' | 'comment' | 'story_reply';
  text?: string;
  attachments?: { type: string; url?: string }[];
  timestamp: Date;
  /** Ads attribution referral, when present on the message. */
  referral?: { adId?: string; adSetId?: string; campaignId?: string; source?: string };
}

// ── Raw Meta webhook envelope shapes (subset we consume) ──────────

export interface MetaWebhookBody {
  object: string; // "instagram" | "page" | "whatsapp_business_account"
  entry: MetaEntry[];
}

export interface MetaEntry {
  id: string;
  time?: number;
  messaging?: MetaMessaging[];
  changes?: MetaChange[];
}

export interface MetaMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: { type: string; payload?: { url?: string } }[];
    reply_to?: { story?: { id: string } };
  };
  referral?: { ref?: string; ad_id?: string; source?: string };
}

export interface MetaChange {
  field: string; // "comments", "messages", ...
  value: Record<string, unknown>;
}
