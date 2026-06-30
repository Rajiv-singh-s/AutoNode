import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '@autonode/ai';

export const AI_SERVICE = Symbol('AI_SERVICE');

/**
 * Builds the provider-agnostic AiService from validated config. Swapping
 * AI_PROVIDER in the environment is the only change needed to switch backends.
 */
export const aiServiceProvider: Provider = {
  provide: AI_SERVICE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AiService =>
    new AiService({
      provider: config.get<'openai' | 'anthropic'>('AI_PROVIDER', 'anthropic'),
      openai: {
        apiKey: config.get<string>('OPENAI_API_KEY', ''),
        model: config.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
      },
      anthropic: {
        apiKey: config.get<string>('ANTHROPIC_API_KEY', ''),
        model: config.get<string>('ANTHROPIC_MODEL', 'claude-opus-4-8'),
      },
    }),
};
