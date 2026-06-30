import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider, CompletionRequest } from '../provider.js';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(opts: { apiKey: string; model: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model;
  }

  async complete(req: CompletionRequest): Promise<string> {
    // Anthropic has no dedicated JSON mode; we steer via the system prompt and
    // prefill an opening brace so the model continues valid JSON.
    const system = req.json
      ? `${req.system}\n\nRespond with a single valid JSON object and nothing else.`
      : req.system;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.2,
      system,
      messages: [
        { role: 'user', content: req.user },
        ...(req.json ? [{ role: 'assistant' as const, content: '{' }] : []),
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Re-attach the prefilled brace when in JSON mode.
    return req.json ? `{${text}` : text;
  }
}
