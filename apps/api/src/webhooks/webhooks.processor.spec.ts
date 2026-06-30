import { describe, expect, it, vi } from 'vitest';
import { AutomationTrigger } from '@autonode/database';
import { WebhooksProcessor } from './webhooks.processor';

function makeProcessor() {
  const prisma = {} as ConstructorParameters<typeof WebhooksProcessor>[0];
  const ai = {} as ConstructorParameters<typeof WebhooksProcessor>[1];
  const realtime = {} as ConstructorParameters<typeof WebhooksProcessor>[2];
  const automations = {
    handleTrigger: vi.fn(async () => undefined),
  } as unknown as ConstructorParameters<typeof WebhooksProcessor>[3];
  const notifications = {} as ConstructorParameters<typeof WebhooksProcessor>[4];

  const processor = new WebhooksProcessor(prisma, ai, realtime, automations, notifications);
  return { processor, automations };
}

describe('WebhooksProcessor automation trigger dispatch', () => {
  it('fires DM + NEW_CONVERSATION triggers for first-touch messages', async () => {
    const { processor, automations } = makeProcessor();

    await (processor as unknown as {
      fireAutomations: (
        orgId: string,
        ev: { kind: 'message'; text: string },
        conversationId: string,
        contactId: string,
        channelId: string,
        conversationIsNew: boolean,
      ) => Promise<void>;
    }).fireAutomations(
      'org_1',
      { kind: 'message', text: 'hello' },
      'conv_1',
      'contact_1',
      'channel_1',
      true,
    );

    expect(automations.handleTrigger).toHaveBeenCalledTimes(2);
    expect(automations.handleTrigger).toHaveBeenNthCalledWith(
      1,
      'org_1',
      AutomationTrigger.DM_KEYWORD,
      expect.objectContaining({ text: 'hello', conversationId: 'conv_1' }),
    );
    expect(automations.handleTrigger).toHaveBeenNthCalledWith(
      2,
      'org_1',
      AutomationTrigger.NEW_CONVERSATION,
      expect.objectContaining({ text: 'hello', conversationId: 'conv_1' }),
    );
  });

  it('maps comment events to COMMENT_KEYWORD only for existing conversations', async () => {
    const { processor, automations } = makeProcessor();

    await (processor as unknown as {
      fireAutomations: (
        orgId: string,
        ev: { kind: 'comment'; text: string },
        conversationId: string,
        contactId: string,
        channelId: string,
        conversationIsNew: boolean,
      ) => Promise<void>;
    }).fireAutomations(
      'org_1',
      { kind: 'comment', text: 'price?' },
      'conv_1',
      'contact_1',
      'channel_1',
      false,
    );

    expect(automations.handleTrigger).toHaveBeenCalledTimes(1);
    expect(automations.handleTrigger).toHaveBeenCalledWith(
      'org_1',
      AutomationTrigger.COMMENT_KEYWORD,
      expect.objectContaining({ text: 'price?' }),
    );
  });
});

