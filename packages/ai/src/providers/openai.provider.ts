import OpenAI from 'openai';
import type { AiProvider, CompletionRequest } from '../provider.js';

export class OpenAIProvider implements AiProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(opts: { apiKey: string; model: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model;
  }

  async complete(req: CompletionRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.2,
      ...(req.json ? { response_format: { type: 'json_object' as const } } : {}),
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
