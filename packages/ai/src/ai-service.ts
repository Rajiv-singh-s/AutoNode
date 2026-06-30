import { z } from 'zod';
import type { AiAnalysis } from '@autonode/shared';
import type { AiConfig, AiProvider } from './provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';

export interface ConversationTurn {
  role: 'contact' | 'agent';
  text: string;
}

const analysisSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  buyingIntent: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
  leadScore: z.number().int().min(0).max(100),
  priorityScore: z.number().int().min(0).max(100),
  isSpam: z.boolean(),
  language: z.string().min(2).max(8),
  labels: z.array(z.string()).max(8),
  suggestedReplies: z.array(z.string()).max(3),
});

const ANALYSIS_SYSTEM = `You are AutoNode's sales intelligence engine for an AI-powered customer acquisition platform.
You analyze a customer conversation from a business's social inbox (Instagram, Messenger, or WhatsApp) and return a structured assessment.

Scoring rules:
- leadScore (0-100): likelihood this contact becomes a paying customer. Weigh explicit buying signals, specificity, urgency, and engagement.
- priorityScore (0-100): how urgently a human should respond. High for hot buyers, complaints, or time-sensitive asks.
- buyingIntent: NONE for spam/greetings, HIGH for explicit purchase intent ("how do I pay", "want to order").
- isSpam: true for bots, link spam, irrelevant promotions, or gibberish.
- language: ISO 639-1 code of the contact's language.
- labels: 0-8 short lowercase tags (e.g. "pricing", "shipping", "complaint", "returning-customer").
- suggestedReplies: up to 3 concise, friendly, on-brand replies the agent could send next. Empty array if spam.
Keep the summary to one or two sentences.`;

/** Deterministic, provider-free fallback so the platform degrades gracefully. */
function heuristicAnalysis(turns: ConversationTurn[]): AiAnalysis {
  const text = turns
    .filter((t) => t.role === 'contact')
    .map((t) => t.text)
    .join(' ')
    .toLowerCase();
  const buyWords = ['buy', 'price', 'order', 'cost', 'pay', 'purchase', 'how much', 'shipping'];
  const hits = buyWords.filter((w) => text.includes(w)).length;
  const intent = hits >= 2 ? 'HIGH' : hits === 1 ? 'MEDIUM' : 'LOW';
  const score = Math.min(100, 20 + hits * 25);
  return {
    summary: turns.at(-1)?.text?.slice(0, 160) ?? 'No messages yet.',
    sentiment: 'NEUTRAL',
    buyingIntent: intent,
    leadScore: score,
    priorityScore: score,
    isSpam: false,
    language: 'en',
    labels: hits > 0 ? ['pricing'] : [],
    suggestedReplies: [],
  };
}

export class AiService {
  // null = no API key configured → operate in deterministic heuristic-only mode.
  private readonly provider: AiProvider | null;

  constructor(config: AiConfig) {
    this.provider = AiService.buildProvider(config);
  }

  /**
   * Builds the configured provider, or returns null when no API key is set so
   * the platform degrades gracefully to heuristics instead of failing to boot.
   */
  static buildProvider(config: AiConfig): AiProvider | null {
    if (config.provider === 'openai') {
      return config.openai?.apiKey ? new OpenAIProvider(config.openai) : null;
    }
    return config.anthropic?.apiKey ? new AnthropicProvider(config.anthropic) : null;
  }

  get providerName(): string {
    return this.provider?.name ?? 'heuristic';
  }

  /** Full conversation analysis used by the AI queue worker. */
  async analyzeConversation(turns: ConversationTurn[]): Promise<AiAnalysis> {
    if (!this.provider) return heuristicAnalysis(turns);

    const transcript = turns
      .map((t) => `${t.role === 'contact' ? 'Customer' : 'Agent'}: ${t.text}`)
      .join('\n');

    let raw: string;
    try {
      raw = await this.provider.complete({
        system: ANALYSIS_SYSTEM,
        user: `Conversation transcript:\n${transcript}`,
        json: true,
        temperature: 0.1,
        maxTokens: 700,
      });
    } catch {
      return heuristicAnalysis(turns);
    }

    const parsed = AiService.safeParseJson(raw);
    const result = analysisSchema.safeParse(parsed);
    return result.success ? result.data : heuristicAnalysis(turns);
  }

  /** Lightweight, on-demand reply suggestions for the AI assistant panel. */
  async suggestReplies(turns: ConversationTurn[], instruction?: string): Promise<string[]> {
    if (!this.provider) return [];

    const transcript = turns
      .map((t) => `${t.role === 'contact' ? 'Customer' : 'Agent'}: ${t.text}`)
      .join('\n');
    try {
      const raw = await this.provider.complete({
        system:
          'You write concise, friendly, on-brand replies for a business social inbox. Return JSON: {"replies": string[]} with up to 3 options.',
        user: `${instruction ? `Instruction: ${instruction}\n\n` : ''}Conversation:\n${transcript}`,
        json: true,
        temperature: 0.5,
        maxTokens: 400,
      });
      const parsed = AiService.safeParseJson(raw) as { replies?: unknown };
      const replies = z.array(z.string()).max(3).safeParse(parsed?.replies);
      return replies.success ? replies.data : [];
    } catch {
      return [];
    }
  }

  private static safeParseJson(raw: string): unknown {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
