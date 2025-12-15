import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { contextSpace, embedding, featureRequest } from '../../db/schema.js'
import { AIProviderFactory } from './factory.js'
import { AIUsageService } from './usage.js'

/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Handles:
 * - Embedding generation
 * - Embedding storage
 * - Vector similarity search
 * - Context building for AI prompts
 */

interface StoreEmbeddingParams {
  contextSpaceId: string
  sourceType: 'description' | 'feature_request' | 'integration_data'
  sourceId: string
  content: string
  embedding: number[]
}

interface SimilarEmbedding {
  id: string
  contextSpaceId: string
  sourceType: string
  sourceId: string
  content: string
  similarity: number
}

export class RAGService {
  /**
   * Generate embedding for text
   *
   * Uses AI provider factory to get embedding-capable provider
   * Logs usage for cost tracking
   *
   * @param userId - User ID for credential resolution
   * @param organizationId - Organization ID for credential resolution
   * @param text - Text to embed
   * @returns Embedding vector (number array)
   */
  static async generateEmbedding(
    userId: string,
    organizationId: string,
    text: string,
  ): Promise<number[]> {
    // Get embedding provider (Ollama or OpenAI, not Anthropic)
    const { provider, source, providerName } = await AIProviderFactory.getEmbeddingProvider(
      userId,
      organizationId,
    )

    // Generate embedding
    const response = await provider.embed(text)

    // Log usage
    await AIUsageService.logUsage({
      userId,
      organizationId,
      provider: providerName,
      modelId: response.model,
      capability: 'embeddings',
      tokensInput: response.tokens,
      tokensOutput: 0,
      credentialSource: source,
    })

    return response.embedding
  }

  /**
   * Store embedding in database
   *
   * @param params - Embedding data
   * @returns Stored embedding record
   */
  static async storeEmbedding(params: StoreEmbeddingParams) {
    const [result] = await db
      .insert(embedding)
      .values({
        id: crypto.randomUUID(),
        contextSpaceId: params.contextSpaceId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        content: params.content,
        embedding: params.embedding,
        createdAt: new Date(),
      })
      .returning()

    return result
  }

  /**
   * Search for similar embeddings using vector similarity
   *
   * Uses pgvector cosine distance (1 - cosine similarity)
   * Lower distance = more similar
   *
   * @param queryEmbedding - Query embedding vector
   * @param contextSpaceId - Optional: filter by context space
   * @param limit - Number of results to return
   * @returns Similar embeddings with similarity scores
   */
  static async searchSimilar(
    queryEmbedding: number[],
    contextSpaceId?: string,
    limit = 10,
  ): Promise<SimilarEmbedding[]> {
    // Build WHERE clause
    const whereClause = contextSpaceId
      ? sql`${embedding.contextSpaceId} = ${contextSpaceId}`
      : sql`1=1`

    // Query with cosine distance
    // Note: <=> is the pgvector cosine distance operator
    // We use (1 - distance) to get similarity score (higher = more similar)
    const results = await db.execute(sql`
      SELECT
        ${embedding.id},
        ${embedding.contextSpaceId},
        ${embedding.sourceType},
        ${embedding.sourceId},
        ${embedding.content},
        (1 - (${embedding.embedding} <=> ${sql.raw(`'[${queryEmbedding.join(',')}]'`)}::vector)) as similarity
      FROM ${embedding}
      WHERE ${whereClause}
      ORDER BY ${embedding.embedding} <=> ${sql.raw(`'[${queryEmbedding.join(',')}]'`)}::vector
      LIMIT ${limit}
    `)

    return results.rows as unknown as SimilarEmbedding[]
  }

  /**
   * Get full context for a context space
   *
   * Builds a comprehensive context string including:
   * - Space description
   * - Parent space chain
   * - Child spaces
   * - Feature requests
   * - Similar contexts via embeddings
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID for embedding generation
   * @param organizationId - Organization ID
   * @returns Context string for AI prompts
   */
  static async getContextForSpace(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<string> {
    // Get the space itself
    const space = await db.query.contextSpace.findFirst({
      where: eq(contextSpace.id, contextSpaceId),
    })

    if (!space) {
      throw new Error(`Context space ${contextSpaceId} not found`)
    }

    const contextParts: string[] = []

    // 1. Space details
    contextParts.push(`# Context Space: ${space.name}`)
    if (space.description) {
      contextParts.push(`\nDescription: ${space.description}`)
    }
    if (space.type) {
      contextParts.push(`Type: ${space.type}`)
    }

    // 2. Parent chain
    if (space.parentId) {
      const parents = await this.getParentChain(space.parentId)
      if (parents.length > 0) {
        contextParts.push(`\n## Parent Spaces:`)
        parents.forEach((parent) => {
          contextParts.push(`- ${parent.name}${parent.description ? `: ${parent.description}` : ''}`)
        })
      }
    }

    // 3. Child spaces
    const children = await db.query.contextSpace.findMany({
      where: eq(contextSpace.parentId, contextSpaceId),
    })

    if (children.length > 0) {
      contextParts.push(`\n## Child Spaces:`)
      children.forEach((child) => {
        contextParts.push(`- ${child.name}${child.description ? `: ${child.description}` : ''}`)
      })
    }

    // 4. Feature requests
    const features = await db.query.featureRequest.findMany({
      where: eq(featureRequest.contextSpaceId, contextSpaceId),
      limit: 50, // Limit to avoid huge context
    })

    if (features.length > 0) {
      contextParts.push(`\n## Feature Requests (${features.length} total):`)
      features.forEach((feature) => {
        contextParts.push(`- ${feature.title}${feature.description ? `: ${feature.description}` : ''}`)
      })
    }

    // 5. Similar contexts via embeddings
    if (space.description) {
      try {
        const queryEmbedding = await this.generateEmbedding(
          userId,
          organizationId,
          space.description,
        )

        const similar = await this.searchSimilar(queryEmbedding, undefined, 5)

        // Filter out the current space and only show highly similar (>0.8)
        const relevantSimilar = similar.filter(
          s => s.contextSpaceId !== contextSpaceId && s.similarity > 0.8,
        )

        if (relevantSimilar.length > 0) {
          contextParts.push(`\n## Related Contexts:`)
          relevantSimilar.forEach((sim) => {
            contextParts.push(`- ${sim.content} (similarity: ${sim.similarity.toFixed(2)})`)
          })
        }
      }
      catch (error) {
        // Don't fail if embeddings don't work yet
        console.error('Failed to get similar contexts:', error)
      }
    }

    return contextParts.join('\n')
  }

  /**
   * Get parent chain for a context space
   * Returns array from immediate parent to root
   */
  private static async getParentChain(
    parentId: string,
    chain: typeof contextSpace.$inferSelect[] = [],
  ): Promise<typeof contextSpace.$inferSelect[]> {
    const parent = await db.query.contextSpace.findFirst({
      where: eq(contextSpace.id, parentId),
    })

    if (!parent) {
      return chain
    }

    chain.push(parent)

    if (parent.parentId) {
      return this.getParentChain(parent.parentId, chain)
    }

    return chain
  }

  /**
   * Embed context space description
   *
   * Generates and stores embedding for a context space's description
   * Should be called on space create/update
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   */
  static async embedContextSpace(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const space = await db.query.contextSpace.findFirst({
      where: eq(contextSpace.id, contextSpaceId),
    })

    if (!space || !space.description) {
      return // Nothing to embed
    }

    // Check if embedding already exists
    const existingEmbedding = await db.query.embedding.findFirst({
      where: sql`${embedding.contextSpaceId} = ${contextSpaceId}
                 AND ${embedding.sourceType} = 'description'
                 AND ${embedding.sourceId} = ${contextSpaceId}`,
    })

    // Generate embedding
    const embeddingVector = await this.generateEmbedding(
      userId,
      organizationId,
      space.description,
    )

    if (existingEmbedding) {
      // Update existing
      await db
        .update(embedding)
        .set({
          content: space.description,
          embedding: embeddingVector,
        })
        .where(eq(embedding.id, existingEmbedding.id))
    }
    else {
      // Create new
      await this.storeEmbedding({
        contextSpaceId,
        sourceType: 'description',
        sourceId: contextSpaceId,
        content: space.description,
        embedding: embeddingVector,
      })
    }
  }

  /**
   * Embed feature request
   *
   * Generates and stores embedding for a feature request
   * Should be called on feature request create/update
   *
   * @param featureRequestId - Feature request ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   */
  static async embedFeatureRequest(
    featureRequestId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const feature = await db.query.featureRequest.findFirst({
      where: eq(featureRequest.id, featureRequestId),
    })

    if (!feature) {
      return
    }

    // Combine title and description for better context
    const content = [feature.title, feature.description].filter(Boolean).join('\n')

    if (!content) {
      return // Nothing to embed
    }

    // Check if embedding already exists
    const existingEmbedding = await db.query.embedding.findFirst({
      where: sql`${embedding.contextSpaceId} = ${feature.contextSpaceId}
                 AND ${embedding.sourceType} = 'feature_request'
                 AND ${embedding.sourceId} = ${featureRequestId}`,
    })

    // Generate embedding
    const embeddingVector = await this.generateEmbedding(
      userId,
      organizationId,
      content,
    )

    if (existingEmbedding) {
      // Update existing
      await db
        .update(embedding)
        .set({
          content,
          embedding: embeddingVector,
        })
        .where(eq(embedding.id, existingEmbedding.id))
    }
    else {
      // Create new
      await this.storeEmbedding({
        contextSpaceId: feature.contextSpaceId,
        sourceType: 'feature_request',
        sourceId: featureRequestId,
        content,
        embedding: embeddingVector,
      })
    }
  }

  /**
   * Batch re-embed all existing data
   *
   * Useful for:
   * - Initial setup
   * - Model changes
   * - Data migration
   *
   * @param organizationId - Organization ID
   * @param userId - User ID (for credential resolution)
   */
  static async reembedAll(
    organizationId: string,
    userId: string,
  ): Promise<{ spaces: number, features: number }> {
    // Get all spaces in organization
    const spaces = await db.query.contextSpace.findMany({
      where: eq(contextSpace.organizationId, organizationId),
    })

    let spacesEmbedded = 0
    for (const space of spaces) {
      if (space.description) {
        await this.embedContextSpace(space.id, userId, organizationId)
        spacesEmbedded++
      }
    }

    // Get all features in organization (via context spaces)
    const features = await db.query.featureRequest.findMany({
      where: sql`${featureRequest.contextSpaceId} IN (
        SELECT id FROM ${contextSpace} WHERE ${contextSpace.organizationId} = ${organizationId}
      )`,
    })

    let featuresEmbedded = 0
    for (const feature of features) {
      if (feature.title || feature.description) {
        await this.embedFeatureRequest(feature.id, userId, organizationId)
        featuresEmbedded++
      }
    }

    return {
      spaces: spacesEmbedded,
      features: featuresEmbedded,
    }
  }
}
