import type { AIProvider, CredentialSource } from '@common/constants'
import type { AIProvider as AIProviderInterface } from './types.js'
import { env } from '../../lib/env.js'
import { AnthropicProvider } from './providers/anthropic.js'
import { OllamaProvider } from './providers/ollama.js'
import { OpenAIProvider } from './providers/openai.js'

interface ProviderResult {
  provider: AIProviderInterface
  source: CredentialSource
  providerName: AIProvider
}

/**
 * AI Provider Factory
 *
 * Creates AI provider instances with credential resolution.
 *
 * Current implementation (Sprint 2):
 * - System credentials only (from env vars)
 * - Ollama as primary provider for development
 *
 * Future (Sprint 3+):
 * - User BYO tokens (check ai_user_credential table)
 * - Organization credentials (check ai_provider_config table)
 * - Full credential resolution chain: user → org → system
 */
export class AIProviderFactory {
  /**
   * Get AI provider instance
   *
   * For now: Always returns system provider from env vars
   *
   * TODO (Sprint 3): Implement full credential resolution
   * 1. Check user's BYO token in ai_user_credential table
   * 2. Fallback to organization config in ai_provider_config table
   * 3. Fallback to system/env vars (current implementation)
   *
   * @param _userId - User ID (unused for now, needed in Sprint 3)
   * @param _organizationId - Organization ID (unused for now, needed in Sprint 3)
   * @param preferredProvider - Override default provider
   * @returns Provider instance with metadata
   */
  static async getProvider(
    _userId: string,
    _organizationId: string,
    preferredProvider?: AIProvider,
  ): Promise<ProviderResult> {
    const targetProvider = preferredProvider || env.AI_DEFAULT_PROVIDER

    // For now: Always use system credentials from env
    // TODO (Sprint 3): Add database lookups for user/org credentials
    return {
      provider: this.createProviderFromEnv(targetProvider),
      source: 'system',
      providerName: targetProvider,
    }
  }

  /**
   * Create provider instance from environment variables
   */
  private static createProviderFromEnv(provider: AIProvider): AIProviderInterface {
    const providerMap: Record<AIProvider, () => AIProviderInterface> = {
      ollama: () => {
        if (!env.AI_OLLAMA_URL || !env.AI_OLLAMA_CHAT_MODEL || !env.AI_OLLAMA_EMBED_MODEL) {
          throw new Error(
            'Ollama provider selected but one or more required environment variables are not set: '
            + 'AI_OLLAMA_URL, AI_OLLAMA_CHAT_MODEL, AI_OLLAMA_EMBED_MODEL. '
            + 'Ensure Ollama is properly configured or choose a different provider.',
          )
        }

        return new OllamaProvider(
          env.AI_OLLAMA_URL,
          env.AI_OLLAMA_CHAT_MODEL,
          env.AI_OLLAMA_EMBED_MODEL,
        )
      },
      openai: () => {
        if (!env.AI_OPENAI_API_KEY || !env.AI_OPENAI_CHAT_MODEL || !env.AI_OPENAI_EMBED_MODEL) {
          throw new Error(
            'OpenAI provider selected but one or more required environment variables are not set: '
            + 'AI_OPENAI_API_KEY, AI_OPENAI_CHAT_MODEL, AI_OPENAI_EMBED_MODEL. ',
          )
        }

        return new OpenAIProvider(
          env.AI_OPENAI_API_KEY,
          env.AI_OPENAI_CHAT_MODEL,
          env.AI_OPENAI_EMBED_MODEL,
        )
      },
      anthropic: () => {
        if (!env.AI_ANTHROPIC_API_KEY || !env.AI_ANTHROPIC_CHAT_MODEL) {
          throw new Error(
            'Anthropic provider selected but AI_ANTHROPIC_API_KEY is not set. '
            + 'Use AI_DEFAULT_PROVIDER=ollama for development.',
          )
        }

        return new AnthropicProvider(
          env.AI_ANTHROPIC_API_KEY,
          env.AI_ANTHROPIC_CHAT_MODEL,
        )
      },
    }

    return providerMap[provider]()
  }

  /**
   * Get embedding provider
   *
   * Special case: Anthropic doesn't support embeddings
   * Falls back to Ollama or OpenAI
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Provider that supports embeddings
   */
  static async getEmbeddingProvider(
    userId: string,
    organizationId: string,
  ): Promise<ProviderResult> {
    const result = await this.getProvider(userId, organizationId)

    // If provider doesn't support embeddings, fallback
    if (result.providerName === 'anthropic') {
      // Fallback to Ollama for embeddings
      return {
        provider: this.createProviderFromEnv('ollama'),
        source: 'system',
        providerName: 'ollama',
      }
    }

    return result
  }
}
