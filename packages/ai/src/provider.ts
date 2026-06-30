/**
 * Provider abstraction: any LLM backend implements `complete`, returning the
 * raw text of a single completion given a system + user prompt. Higher-level
 * AI features (scoring, summaries) are built on top of this in ai-service.ts,
 * so swapping providers never touches feature code.
 */
export interface CompletionRequest {
  system: string;
  user: string;
  /** Force JSON-only output where the provider supports it. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<string>;
}

export type AiProviderName = 'openai' | 'anthropic';

export interface AiConfig {
  provider: AiProviderName;
  openai?: { apiKey: string; model: string };
  anthropic?: { apiKey: string; model: string };
}
