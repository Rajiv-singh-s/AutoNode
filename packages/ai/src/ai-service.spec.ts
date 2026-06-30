import { describe, it, expect } from 'vitest';
import { AiService } from './ai-service.js';
import type { AiProvider } from './provider.js';

/** A provider stub that returns canned JSON, so we test parsing/validation. */
class StubProvider implements AiProvider {
  readonly name = 'stub';
  constructor(private readonly payload: string) {}
  async complete(): Promise<string> {
    return this.payload;
  }
}

function serviceWith(payload: string): AiService {
  const svc = new AiService({ provider: 'anthropic', anthropic: { apiKey: 'x', model: 'm' } });
  // @ts-expect-error override private provider for the test
  svc.provider = new StubProvider(payload);
  return svc;
}

describe('AiService.analyzeConversation', () => {
  it('parses valid model JSON into a typed analysis', async () => {
    const svc = serviceWith(
      JSON.stringify({
        summary: 'Customer wants to buy 3 units.',
        sentiment: 'POSITIVE',
        buyingIntent: 'HIGH',
        leadScore: 90,
        priorityScore: 88,
        isSpam: false,
        language: 'en',
        labels: ['pricing'],
        suggestedReplies: ['Happy to help!'],
      }),
    );
    const result = await svc.analyzeConversation([{ role: 'contact', text: 'I want to order 3' }]);
    expect(result.buyingIntent).toBe('HIGH');
    expect(result.leadScore).toBe(90);
  });

  it('falls back to a heuristic when the model returns garbage', async () => {
    const svc = serviceWith('not json at all');
    const result = await svc.analyzeConversation([
      { role: 'contact', text: 'what is the price to buy this?' },
    ]);
    // Heuristic detects two buy-words ("price", "buy") => HIGH intent.
    expect(result.buyingIntent).toBe('HIGH');
    expect(result.leadScore).toBeGreaterThan(0);
  });
});
