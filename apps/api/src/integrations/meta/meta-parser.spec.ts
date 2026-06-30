import { describe, it, expect } from 'vitest';
import { parseMetaWebhook } from './meta-parser';
import type { MetaWebhookBody } from './meta.types';

describe('parseMetaWebhook', () => {
  it('parses an Instagram DM into a normalized message event', () => {
    const body: MetaWebhookBody = {
      object: 'instagram',
      entry: [
        {
          id: '17841400000000000',
          time: 1700000000,
          messaging: [
            {
              sender: { id: 'igsid_123' },
              recipient: { id: '17841400000000000' },
              timestamp: 1700000000000,
              message: { mid: 'mid_abc', text: 'How much is shipping?' },
            },
          ],
        },
      ],
    };

    const events = parseMetaWebhook(body);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channelType: 'INSTAGRAM',
      senderExternalId: 'igsid_123',
      recipientExternalId: '17841400000000000',
      externalMessageId: 'mid_abc',
      kind: 'message',
      text: 'How much is shipping?',
    });
  });

  it('flags a story reply', () => {
    const body: MetaWebhookBody = {
      object: 'instagram',
      entry: [
        {
          id: 'ig1',
          messaging: [
            {
              sender: { id: 's1' },
              recipient: { id: 'ig1' },
              timestamp: 1,
              message: { mid: 'm1', text: 'love this!', reply_to: { story: { id: 'story1' } } },
            },
          ],
        },
      ],
    };
    expect(parseMetaWebhook(body)[0]?.kind).toBe('story_reply');
  });

  it('parses an Instagram comment change', () => {
    const body: MetaWebhookBody = {
      object: 'instagram',
      entry: [
        {
          id: 'ig1',
          changes: [
            {
              field: 'comments',
              value: { id: 'c1', text: 'price?', from: { id: 'u1', username: 'buyer' } },
            },
          ],
        },
      ],
    };
    const ev = parseMetaWebhook(body)[0];
    expect(ev?.kind).toBe('comment');
    expect(ev?.senderName).toBe('buyer');
  });

  it('parses a WhatsApp Cloud API message', () => {
    const body: MetaWebhookBody = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba1',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'pn_1' },
                contacts: [{ profile: { name: 'Sam' }, wa_id: '15551234567' }],
                messages: [
                  {
                    id: 'wamid_1',
                    from: '15551234567',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'I want to buy' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const ev = parseMetaWebhook(body)[0];
    expect(ev?.channelType).toBe('WHATSAPP');
    expect(ev?.senderExternalId).toBe('15551234567');
    expect(ev?.recipientExternalId).toBe('pn_1');
    expect(ev?.text).toBe('I want to buy');
  });

  it('ignores unknown webhook objects and delivery echoes', () => {
    expect(parseMetaWebhook({ object: 'unknown', entry: [] })).toHaveLength(0);
    const echo: MetaWebhookBody = {
      object: 'page',
      entry: [{ id: 'p1', messaging: [{ sender: { id: 's' }, recipient: { id: 'p1' }, timestamp: 1 }] }],
    };
    expect(parseMetaWebhook(echo)).toHaveLength(0);
  });
});
