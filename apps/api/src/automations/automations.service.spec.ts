import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LeadStage } from '@autonode/database';
import { AutomationsService } from './automations.service';

function makeService() {
  const prisma = {
    automation: {
      create: vi.fn(async (args: unknown) => args),
    },
  } as unknown as ConstructorParameters<typeof AutomationsService>[0];

  const meta = {} as ConstructorParameters<typeof AutomationsService>[1];
  const realtime = {} as ConstructorParameters<typeof AutomationsService>[2];
  const billing = { enforceLimit: vi.fn(async () => undefined) } as ConstructorParameters<
    typeof AutomationsService
  >[3];
  const svc = new AutomationsService(prisma, meta, realtime, billing);

  return { svc, prisma };
}

describe('AutomationsService validation', () => {
  it('accepts a valid actions array payload', async () => {
    const { svc, prisma } = makeService();

    await svc.create('org_1', {
      name: 'Welcome DM',
      trigger: 'DM_KEYWORD',
      conditions: { keywords: ['price'], matchType: 'any' },
      actions: [
        { type: 'send_dm', text: 'Thanks for reaching out!' },
        { type: 'add_label', label: 'hot' },
        { type: 'set_stage', stage: LeadStage.QUALIFIED },
      ],
    });

    expect(prisma.automation.create).toHaveBeenCalledTimes(1);
    const payload = (prisma.automation.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { actions: unknown[]; conditions: { keywords: string[]; matchType: string } };
    };
    expect(Array.isArray(payload.data.actions)).toBe(true);
    expect(payload.data.actions).toHaveLength(3);
    expect(payload.data.conditions).toEqual({ keywords: ['price'], matchType: 'any' });
  });

  it('rejects invalid actions payloads', async () => {
    const { svc } = makeService();

    await expect(async () =>
      svc.create('org_1', {
        name: 'Broken automation',
        trigger: 'DM_KEYWORD',
        conditions: { keywords: [], matchType: 'any' },
        actions: [{ type: 'send_dm' }] as unknown as never[],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed conditions payloads', async () => {
    const { svc } = makeService();

    await expect(async () =>
      svc.create('org_1', {
        name: 'Broken conditions',
        trigger: 'DM_KEYWORD',
        conditions: { keywords: 'price', matchType: 'any' } as unknown as never,
        actions: [{ type: 'send_dm', text: 'Hi' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
