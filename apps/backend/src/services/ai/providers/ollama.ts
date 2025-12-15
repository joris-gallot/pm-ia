import type { AIProvider, ChatMessage, ChatResponse, EmbeddingResponse } from '../types'

/**
 * Ollama provider implementation
 * For local development - free and fast
 */
export class OllamaProvider implements AIProvider {
  name = 'ollama'

  constructor(
    private baseUrl: string,
    private defaultChatModel: string,
    private defaultEmbedModel: string,
  ) {}

  async chat(messages: ChatMessage[], model?: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultChatModel,
        messages,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama chat API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    return {
      content: data.message.content,
      tokensInput: data.prompt_eval_count || 0,
      tokensOutput: data.eval_count || 0,
      model: data.model,
    }
  }

  async embed(text: string, model?: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultEmbedModel,
        prompt: text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama embeddings API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    return {
      embedding: data.embedding,
      tokens: 0, // Ollama doesn't return token count for embeddings
      model: model || this.defaultEmbedModel,
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama list models API error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()
    return data.models.map((m: { name: string }) => m.name)
  }
}
