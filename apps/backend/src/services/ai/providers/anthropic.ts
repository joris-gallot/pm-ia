import type { AIProvider, ChatMessage, ChatResponse, EmbeddingResponse } from '../types'

/**
 * Anthropic provider implementation
 * TODO: Implement when switching to production
 *
 * For now, this is a stub that throws errors
 * Install: pnpm add @anthropic-ai/sdk
 */
export class AnthropicProvider implements AIProvider {
  name = 'anthropic'

  constructor(
    private apiKey: string,
    private defaultChatModel: string,
  ) {}

  async chat(_messages: ChatMessage[], _model?: string): Promise<ChatResponse> {
    throw new Error('Anthropic provider not implemented yet. Use Ollama for development.')

    // TODO: Implement with Anthropic SDK
    // import Anthropic from '@anthropic-ai/sdk'
    // const client = new Anthropic({ apiKey: this.apiKey })
    //
    // // Extract system message if present
    // const systemMessage = messages.find(m => m.role === 'system')
    // const chatMessages = messages.filter(m => m.role !== 'system')
    //
    // const response = await client.messages.create({
    //   model: model || this.defaultChatModel,
    //   max_tokens: 4096,
    //   system: systemMessage?.content,
    //   messages: chatMessages.map(m => ({
    //     role: m.role as 'user' | 'assistant',
    //     content: m.content,
    //   })),
    // })
    //
    // return {
    //   content: response.content[0].type === 'text' ? response.content[0].text : '',
    //   tokensInput: response.usage.input_tokens,
    //   tokensOutput: response.usage.output_tokens,
    //   model: response.model,
    // }
  }

  async embed(_text: string, _model?: string): Promise<EmbeddingResponse> {
    throw new Error('Anthropic does not support embeddings. Use OpenAI or Ollama.')
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ]
  }
}
