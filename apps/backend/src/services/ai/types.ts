import type { MessageRole } from '@common/constants'

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/**
 * Chat completion response
 */
export interface ChatResponse {
  content: string
  tokensInput: number
  tokensOutput: number
  model: string
}

/**
 * Embedding generation response
 */
export interface EmbeddingResponse {
  embedding: number[]
  tokens: number
  model: string
}

/**
 * AI Provider interface
 * All providers (OpenAI, Anthropic, Ollama) must implement this
 */
export interface AIProvider {
  /** Provider name */
  name: string

  /**
   * Generate chat completion
   * @param messages - Array of chat messages
   * @param model - Optional model override
   * @returns Chat response with content and token usage
   */
  chat: (messages: ChatMessage[], model?: string) => Promise<ChatResponse>

  /**
   * Generate embedding from text
   * @param text - Text to embed
   * @param model - Optional model override
   * @returns Embedding vector and token usage
   */
  embed: (text: string, model?: string) => Promise<EmbeddingResponse>

  /**
   * List available models for this provider
   * @returns Array of model IDs
   */
  listModels: () => Promise<string[]>
}
