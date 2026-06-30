import { ChannelType } from '@autonode/database';
import type {
  MetaWebhookBody,
  MetaMessaging,
  NormalizedInboundEvent,
} from './meta.types';

/** Maps the Meta webhook `object` field to our ChannelType. */
function channelTypeFor(object: string): ChannelType | null {
  switch (object) {
    case 'instagram':
      return ChannelType.INSTAGRAM;
    case 'page':
      return ChannelType.MESSENGER;
    case 'whatsapp_business_account':
      return ChannelType.WHATSAPP;
    default:
      return null;
  }
}

function fromMessaging(
  channelType: ChannelType,
  pageOrAccountId: string,
  m: MetaMessaging,
): NormalizedInboundEvent | null {
  // Skip echoes / delivery receipts that lack an inbound message.
  if (!m.message) return null;
  const isStoryReply = Boolean(m.message.reply_to?.story);
  return {
    channelType,
    recipientExternalId: m.recipient?.id ?? pageOrAccountId,
    senderExternalId: m.sender.id,
    externalMessageId: m.message.mid,
    kind: isStoryReply ? 'story_reply' : 'message',
    text: m.message.text,
    attachments: m.message.attachments?.map((a) => ({
      type: a.type,
      url: a.payload?.url,
    })),
    timestamp: new Date(m.timestamp ?? Date.now()),
    referral: m.referral
      ? { adId: m.referral.ad_id, source: m.referral.source }
      : undefined,
  };
}

/** WhatsApp Cloud API delivers messages under entry[].changes[].value.messages[]. */
function fromWhatsAppChange(
  value: Record<string, unknown>,
): NormalizedInboundEvent[] {
  const metadata = value.metadata as { phone_number_id?: string } | undefined;
  const contacts = (value.contacts as { profile?: { name?: string }; wa_id?: string }[]) ?? [];
  const messages = (value.messages as
    | { id: string; from: string; timestamp: string; type: string; text?: { body: string } }[]
    | undefined) ?? [];
  return messages.map((msg) => ({
    channelType: ChannelType.WHATSAPP,
    recipientExternalId: metadata?.phone_number_id ?? '',
    senderExternalId: msg.from,
    senderName: contacts[0]?.profile?.name,
    externalMessageId: msg.id,
    kind: 'message' as const,
    text: msg.text?.body,
    timestamp: new Date(Number(msg.timestamp) * 1000),
  }));
}

/**
 * Flattens a raw Meta webhook body into normalized inbound events. Pure and
 * side-effect free so it is trivial to unit test against captured payloads.
 */
export function parseMetaWebhook(body: MetaWebhookBody): NormalizedInboundEvent[] {
  const channelType = channelTypeFor(body.object);
  if (!channelType) return [];

  const events: NormalizedInboundEvent[] = [];
  for (const entry of body.entry ?? []) {
    if (channelType === ChannelType.WHATSAPP) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'messages') {
          events.push(...fromWhatsAppChange(change.value));
        }
      }
      continue;
    }

    // Instagram + Messenger deliver under `messaging`.
    for (const m of entry.messaging ?? []) {
      const ev = fromMessaging(channelType, entry.id, m);
      if (ev) events.push(ev);
    }

    // Instagram comments arrive under `changes` with field "comments".
    for (const change of entry.changes ?? []) {
      if (change.field === 'comments') {
        const v = change.value as {
          id?: string;
          text?: string;
          from?: { id?: string; username?: string };
        };
        if (v.from?.id) {
          events.push({
            channelType,
            recipientExternalId: entry.id,
            senderExternalId: v.from.id,
            senderName: v.from.username,
            externalMessageId: v.id,
            kind: 'comment',
            text: v.text,
            timestamp: new Date(),
          });
        }
      }
    }
  }
  return events;
}
