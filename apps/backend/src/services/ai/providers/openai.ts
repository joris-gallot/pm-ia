import type { AIProvider, ChatMessage, ChatResponse, EmbeddingResponse } from '../types'

/**
 * OpenAI provider implementation
 * TODO: Implement when switching to production
 *
 * For now, this is a stub that throws errors
 * Install: pnpm add openai
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai'

  constructor(
    private apiKey: string,
    private defaultChatModel: string,
    private defaultEmbedModel: string,
  ) {}

  async chat(_messages: ChatMessage[], _model?: string): Promise<ChatResponse> {
    throw new Error('OpenAI provider not implemented yet. Use Ollama for development.')

    // TODO: Implement with OpenAI SDK
    // import OpenAI from 'openai'
    // const client = new OpenAI({ apiKey: this.apiKey })
    // const response = await client.chat.completions.create({
    //   model: model || this.defaultChatModel,
    //   messages,
    // })
    // return {
    //   content: response.choices[0].message.content || '',
    //   tokensInput: response.usage?.prompt_tokens || 0,
    //   tokensOutput: response.usage?.completion_tokens || 0,
    //   model: response.model,
    // }
  }

  async embed(_text: string, _model?: string): Promise<EmbeddingResponse> {
    throw new Error('OpenAI provider not implemented yet. Use Ollama for development.')

    // TODO: Implement with OpenAI SDK
    // const response = await client.embeddings.create({
    //   model: model || this.defaultEmbedModel,
    //   input: text,
    // })
    // return {
    //   embedding: response.data[0].embedding,
    //   tokens: response.usage.total_tokens,
    //   model: response.model,
    // }
  }

  async listModels(): Promise<string[]> {
    throw new Error('OpenAI provider not implemented yet. Use Ollama for development.')

    // TODO: Implement with OpenAI SDK
    // const models = await client.models.list()
    // return models.data.map(m => m.id)
  }
}
