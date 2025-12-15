import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { aiConversation, aiMessage, contextSpace, featureRequest } from '../../db/schema.js'
import { AIProviderFactory } from './factory.js'
import { RAGService } from './rag.js'
import { AIUsageService } from './usage.js'

/**
 * Global Assistant Service
 *
 * Provides AI-powered features across multiple context spaces:
 * - Multi-space analysis
 * - Cross-cutting product decisions
 * - Smart space selection
 * - Global chat with auto/manual space selection
 */

interface SpaceRecommendation {
  id: string
  name: string
  description: string | null
  similarity: number
  reason: string
}

export class GlobalAssistantService {
  /**
   * Recommend relevant spaces for a query
   *
   * Uses embeddings to find spaces most relevant to the user's question
   *
   * @param query - User query
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param limit - Max number of recommendations
   * @returns Recommended spaces with similarity scores
   */
  static async recommendSpaces(
    query: string,
    userId: string,
    organizationId: string,
    limit = 5,
  ): Promise<{ spaces: SpaceRecommendation[] }> {
    // Generate embedding for query
    const queryEmbedding = await RAGService.generateEmbedding(userId, organizationId, query)

    // Search for similar space descriptions in the organization
    const allSpaces = await db.query.contextSpace.findMany({
      where: eq(contextSpace.organizationId, organizationId),
    })

    if (allSpaces.length === 0) {
      return { spaces: [] }
    }

    // Get embeddings for all spaces
    const embeddings = await db.query.embedding.findMany({
      where: and(
        eq(sql`source_type`, 'description'),
        inArray(
          sql`source_id`,
          allSpaces.map(s => s.id),
        ),
      ),
    })

    // Calculate similarities
    const similarities = await Promise.all(
      embeddings.map(async (emb) => {
        const space = allSpaces.find(s => s.id === emb.sourceId)
        if (!space)
          return null

        // Use cosine similarity via pgvector
        const result = await db.execute(sql`
          SELECT (1 - (${emb.embedding} <=> ${sql.raw(`'[${queryEmbedding.join(',')}]'`)}::vector)) as similarity
        `)

        const similarity = result.rows[0]?.similarity as number || 0

        return {
          space,
          similarity,
        }
      }),
    )

    // Filter nulls, sort by similarity, take top N
    const topSpaces = similarities
      .filter(s => s !== null && s.similarity > 0.5) // Only include reasonably similar
      .sort((a, b) => b!.similarity - a!.similarity)
      .slice(0, limit)

    // Use AI to explain why each space is relevant
    const { provider, source, providerName } = await AIProviderFactory.getProvider(
      userId,
      organizationId,
    )

    const recommendations: SpaceRecommendation[] = []

    for (const item of topSpaces) {
      if (!item)
        continue

      const systemPrompt = `You are a product management assistant. Explain in one brief sentence why this context space is relevant to the user's query.`

      const userPrompt = `Query: "${query}"

Context Space: ${item.space.name}
Description: ${item.space.description || 'No description'}

Why is this space relevant? (One sentence)`

      try {
        const response = await provider.chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ])

        recommendations.push({
          id: item.space.id,
          name: item.space.name,
          description: item.space.description,
          similarity: item.similarity,
          reason: response.content.trim(),
        })

        // Log usage
        await AIUsageService.logUsage({
          userId,
          organizationId,
          provider: providerName,
          modelId: response.model,
          capability: 'chat',
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          credentialSource: source,
        })
      }
      catch {
        // If AI fails, use generic reason
        recommendations.push({
          id: item.space.id,
          name: item.space.name,
          description: item.space.description,
          similarity: item.similarity,
          reason: 'Relevant based on content similarity',
        })
      }
    }

    return { spaces: recommendations }
  }

  /**
   * Analyze across multiple spaces
   *
   * Provides cross-cutting insights, patterns, and recommendations
   *
   * @param spaceIds - Array of space IDs to analyze
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Analysis text
   */
  static async analyzeAcrossSpaces(
    spaceIds: string[],
    userId: string,
    organizationId: string,
  ): Promise<{ analysis: string }> {
    if (spaceIds.length === 0) {
      throw new Error('At least one space ID is required')
    }

    // Get all spaces
    const spaces = await db.query.contextSpace.findMany({
      where: inArray(contextSpace.id, spaceIds),
    })

    if (spaces.length === 0) {
      throw new Error('No spaces found')
    }

    // Get features for all spaces
    const features = await db.query.featureRequest.findMany({
      where: inArray(featureRequest.contextSpaceId, spaceIds),
    })

    // Build context for each space
    const spaceContexts = await Promise.all(
      spaces.map(async (space) => {
        const spaceFeatures = features.filter(f => f.contextSpaceId === space.id)
        return {
          name: space.name,
          description: space.description || 'No description',
          featureCount: spaceFeatures.length,
          features: spaceFeatures.slice(0, 10).map(f => `- ${f.title}`).join('\n'),
        }
      }),
    )

    // Build prompt
    const systemPrompt = `You are a product management assistant specialized in cross-space analysis.

Analyze multiple context spaces together and provide:
1. Common themes and patterns
2. Potential overlaps or conflicts
3. Strategic recommendations
4. Opportunities for synergy

Be concise but insightful.`

    const userPrompt = `Analyze these context spaces together:

${spaceContexts.map(sc => `
## ${sc.name}
Description: ${sc.description}
Features (${sc.featureCount} total):
${sc.features}
`).join('\n')}

Provide a strategic analysis across these spaces.`

    // Get AI provider
    const { provider, source, providerName } = await AIProviderFactory.getProvider(
      userId,
      organizationId,
    )

    // Generate analysis
    const response = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    // Log usage
    await AIUsageService.logUsage({
      userId,
      organizationId,
      provider: providerName,
      modelId: response.model,
      capability: 'chat',
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      credentialSource: source,
    })

    return { analysis: response.content }
  }

  /**
   * Start a global conversation
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Conversation ID
   */
  static async startConversation(
    userId: string,
    organizationId: string,
  ): Promise<{ conversationId: string }> {
    const [conversation] = await db
      .insert(aiConversation)
      .values({
        id: crypto.randomUUID(),
        contextSpaceId: null, // Global conversation
        userId,
        organizationId,
        type: 'global',
        createdAt: new Date(),
      })
      .returning()

    if (!conversation) {
      throw new Error('Failed to create conversation')
    }

    return { conversationId: conversation.id }
  }

  /**
   * Send message in global conversation
   *
   * Two modes:
   * 1. Manual: User selects specific spaces
   * 2. Auto: AI determines relevant spaces from query
   *
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param message - User message
   * @param selectedSpaceIds - Optional: manually selected spaces (manual mode)
   * @returns AI response and spaces used
   */
  static async sendMessage(
    conversationId: string,
    userId: string,
    organizationId: string,
    message: string,
    selectedSpaceIds?: string[],
  ): Promise<{ response: string, spacesUsed: string[] }> {
    // Get conversation
    const conversation = await db.query.aiConversation.findFirst({
      where: eq(aiConversation.id, conversationId),
    })

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    if (conversation.type !== 'global') {
      throw new Error('This conversation is not a global conversation')
    }

    if (conversation.contextSpaceId) {
      throw new Error('This conversation is associated with a specific space, not global')
    }

    // Determine which spaces to use
    let spaceIds: string[]

    if (selectedSpaceIds && selectedSpaceIds.length > 0) {
      // Manual mode: use provided spaces
      spaceIds = selectedSpaceIds
    }
    else {
      // Auto mode: AI determines relevant spaces
      const recommendations = await this.recommendSpaces(message, userId, organizationId, 3)
      spaceIds = recommendations.spaces.map(s => s.id)

      if (spaceIds.length === 0) {
        // No relevant spaces found, use general knowledge
        spaceIds = []
      }
    }

    // Get conversation history
    const messages = await db.query.aiMessage.findMany({
      where: eq(aiMessage.conversationId, conversationId),
      orderBy: (aiMessage, { asc }) => [asc(aiMessage.createdAt)],
    })

    // Build context from selected spaces
    let contextText = ''
    if (spaceIds.length > 0) {
      const contexts = await Promise.all(
        spaceIds.map(spaceId =>
          RAGService.getContextForSpace(spaceId, userId, organizationId).catch(() => null),
        ),
      )

      const validContexts = contexts.filter(c => c !== null)
      if (validContexts.length > 0) {
        contextText = `\n\nRelevant Context Spaces:\n\n${validContexts.join('\n\n---\n\n')}`
      }
    }

    // Build system prompt
    const systemPrompt = `You are a helpful product management assistant with access to multiple context spaces.

Your role:
- Answer questions about product strategy and decisions
- Provide insights across different areas
- Help with cross-cutting decisions
- Be concise but thorough
${contextText ? '\n\nUse the provided context to inform your responses, but you can also use general product management knowledge.' : '\n\nNo specific context provided. Use general product management knowledge.'}`

    // Build message history
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get AI provider
    const { provider, source, providerName } = await AIProviderFactory.getProvider(
      userId,
      organizationId,
    )

    // Generate response
    const response = await provider.chat(chatMessages)

    // Save user message
    await db.insert(aiMessage).values({
      id: crypto.randomUUID(),
      conversationId,
      role: 'user',
      content: message,
      createdAt: new Date(),
    })

    // Save assistant response
    await db.insert(aiMessage).values({
      id: crypto.randomUUID(),
      conversationId,
      role: 'assistant',
      content: response.content,
      createdAt: new Date(),
    })

    // Log usage
    await AIUsageService.logUsage({
      userId,
      organizationId,
      provider: providerName,
      modelId: response.model,
      capability: 'chat',
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      credentialSource: source,
      conversationId,
    })

    return {
      response: response.content,
      spacesUsed: spaceIds,
    }
  }

  /**
   * Get conversation history
   *
   * @param conversationId - Conversation ID
   * @returns Conversation with messages
   */
  static async getConversation(conversationId: string) {
    const conversation = await db.query.aiConversation.findFirst({
      where: eq(aiConversation.id, conversationId),
      with: {
        messages: {
          orderBy: (aiMessage, { asc }) => [asc(aiMessage.createdAt)],
        },
      },
    })

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    return conversation
  }
}
