import type { AICapability } from '@common/constants'
import type { z } from 'zod'
import {
  detectDuplicatesResponseSchema,
  groupByThemeResponseSchema,
  identifyQuickWinsResponseSchema,
  suggestFeaturesResponseSchema,
} from '@common/schemas/ai-responses'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { aiConversation, aiMessage, featureRequest } from '../../db/schema.js'
import { AIProviderFactory } from './factory.js'
import { RAGService } from './rag.js'
import { AIUsageService } from './usage.js'

/**
 * Safely parse AI response with Zod schema
 * Handles JSON parsing and validation errors
 */
function parseAIResponse<T>(
  content: string,
  schema: z.ZodType<T>,
  errorContext: string,
): T | null {
  try {
    const parsed = JSON.parse(content)
    const result = schema.safeParse(parsed)

    if (!result.success) {
      console.error(`Failed to validate ${errorContext}:`, result.error.issues)
      return null
    }

    return result.data
  }
  catch (error) {
    console.error(`Failed to parse JSON for ${errorContext}:`, error)
    return null
  }
}

/**
 * Context Space Assistant Service
 *
 * Provides AI-powered features for a specific context space:
 * - Auto summary generation
 * - Duplicate feature detection
 * - Theme/problem grouping
 * - Quick wins identification
 * - Feature suggestions
 * - Contextual chat
 */

interface DuplicateGroup {
  reason: string
  similarity: number
  features: Array<{
    id: string
    title: string
    description: string | null
  }>
}

interface ThemeGroup {
  theme: string
  description: string
  features: Array<{
    id: string
    title: string
    description: string | null
  }>
}

interface QuickWin {
  id: string
  title: string
  description: string | null
  reason: string
  estimatedEffort: 'low' | 'medium'
  estimatedImpact: 'medium' | 'high'
}

export class ContextAssistantService {
  /**
   * Generate summary of context space
   *
   * Creates a concise overview of:
   * - Purpose and goals
   * - Key features
   * - Current state
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Summary text
   */
  static async generateSummary(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ summary: string }> {
    // Get full context
    const context = await RAGService.getContextForSpace(contextSpaceId, userId, organizationId)

    // Build prompt
    const systemPrompt = `You are a product management assistant. Your task is to create a concise, informative summary of a product context space.

Focus on:
- Main purpose and goals
- Key features and their themes
- Current state and progress
- Important relationships to parent/child spaces

Be concise but comprehensive. Use bullet points where appropriate.`

    const userPrompt = `Please summarize this context space:\n\n${context}`

    // Get AI provider
    const { provider, source, providerName } = await AIProviderFactory.getProvider(
      userId,
      organizationId,
    )

    // Generate summary
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

    return { summary: response.content }
  }

  /**
   * Detect duplicate feature requests
   *
   * Uses AI to identify features that are:
   * - Exact duplicates
   * - Similar intent but different wording
   * - Overlapping functionality
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Groups of duplicate features
   */
  static async detectDuplicates(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ groups: DuplicateGroup[] }> {
    // Get all features in space
    const features = await db.query.featureRequest.findMany({
      where: eq(featureRequest.contextSpaceId, contextSpaceId),
    })

    if (features.length < 2) {
      return { groups: [] }
    }

    // Build feature list for prompt
    const featureList = features
      .map(f => `[${f.id}] ${f.title}${f.description ? `\n  Description: ${f.description}` : ''}`)
      .join('\n\n')

    // Build prompt
    const systemPrompt = `You are a product management assistant specialized in identifying duplicate or overlapping feature requests.

Analyze the feature requests and identify groups that are:
- Exact duplicates
- Similar intent with different wording
- Overlapping functionality that should be merged

Respond with a JSON array of duplicate groups. Each group should have:
- reason: Brief explanation of why they're duplicates
- similarity: Score from 0.0 to 1.0 (1.0 = exact duplicate)
- features: Array of feature IDs that belong to this group

Only include groups with 2+ features and similarity > 0.7.

Example response:
[
  {
    "reason": "Same feature request, different wording",
    "similarity": 0.95,
    "features": ["feat-1", "feat-2"]
  }
]`

    const userPrompt = `Analyze these feature requests for duplicates:\n\n${featureList}`

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

    // Parse response with Zod
    const rawGroups = parseAIResponse(
      response.content,
      detectDuplicatesResponseSchema,
      'duplicate detection',
    )

    if (!rawGroups) {
      return { groups: [] }
    }

    // Hydrate with full feature data
    const groups: DuplicateGroup[] = rawGroups.map((group) => {
      const groupFeatures = group.features
        .map(id => features.find(f => f.id === id))
        .filter(f => f !== undefined)
        .map(f => ({
          id: f!.id,
          title: f!.title,
          description: f!.description,
        }))

      return {
        reason: group.reason,
        similarity: group.similarity,
        features: groupFeatures,
      }
    })

    return { groups }
  }

  /**
   * Group features by theme/problem
   *
   * Uses AI to identify common themes and group features accordingly
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Theme groups
   */
  static async groupByTheme(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ themes: ThemeGroup[] }> {
    // Get all features in space
    const features = await db.query.featureRequest.findMany({
      where: eq(featureRequest.contextSpaceId, contextSpaceId),
    })

    if (features.length === 0) {
      return { themes: [] }
    }

    // Build feature list for prompt
    const featureList = features
      .map(f => `[${f.id}] ${f.title}${f.description ? `\n  Description: ${f.description}` : ''}`)
      .join('\n\n')

    // Build prompt
    const systemPrompt = `You are a product management assistant specialized in identifying themes and patterns in feature requests.

Analyze the feature requests and group them by common themes, problems, or user needs.

Respond with a JSON array of theme groups. Each group should have:
- theme: Short theme name (e.g., "User Authentication", "Performance")
- description: Brief explanation of the theme
- features: Array of feature IDs that belong to this theme

Example response:
[
  {
    "theme": "User Experience",
    "description": "Features focused on improving user interface and interactions",
    "features": ["feat-1", "feat-2", "feat-3"]
  }
]`

    const userPrompt = `Group these feature requests by theme:\n\n${featureList}`

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

    // Parse response with Zod
    const rawThemes = parseAIResponse(
      response.content,
      groupByThemeResponseSchema,
      'theme grouping',
    )

    if (!rawThemes) {
      return { themes: [] }
    }

    // Hydrate with full feature data
    const themes: ThemeGroup[] = rawThemes.map((theme) => {
      const themeFeatures = theme.features
        .map(id => features.find(f => f.id === id))
        .filter(f => f !== undefined)
        .map(f => ({
          id: f!.id,
          title: f!.title,
          description: f!.description,
        }))

      return {
        theme: theme.theme,
        description: theme.description,
        features: themeFeatures,
      }
    })

    return { themes }
  }

  /**
   * Identify quick wins
   *
   * Features that are:
   * - Low effort
   * - High impact
   * - Easy to implement
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Quick win features with estimates
   */
  static async identifyQuickWins(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ quickWins: QuickWin[] }> {
    // Get all features in space
    const features = await db.query.featureRequest.findMany({
      where: eq(featureRequest.contextSpaceId, contextSpaceId),
    })

    if (features.length === 0) {
      return { quickWins: [] }
    }

    // Build feature list for prompt
    const featureList = features
      .map(f => `[${f.id}] ${f.title}${f.description ? `\n  Description: ${f.description}` : ''}`)
      .join('\n\n')

    // Build prompt
    const systemPrompt = `You are a product management assistant specialized in identifying quick wins.

Quick wins are features that:
- Require low to medium effort to implement
- Provide medium to high impact for users
- Can be delivered quickly (days to weeks, not months)

Analyze the feature requests and identify the top quick wins.

Respond with a JSON array. Each quick win should have:
- id: Feature ID
- reason: Why this is a quick win
- estimatedEffort: "low" or "medium"
- estimatedImpact: "medium" or "high"

Only include features that are truly quick wins (limit to top 5-7).

Example response:
[
  {
    "id": "feat-1",
    "reason": "Simple UI change with high user satisfaction impact",
    "estimatedEffort": "low",
    "estimatedImpact": "high"
  }
]`

    const userPrompt = `Identify quick wins from these feature requests:\n\n${featureList}`

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

    // Parse response with Zod
    const rawQuickWins = parseAIResponse(
      response.content,
      identifyQuickWinsResponseSchema,
      'quick wins',
    )

    if (!rawQuickWins) {
      return { quickWins: [] }
    }

    // Hydrate with full feature data
    const quickWins: QuickWin[] = rawQuickWins
      .map((qw) => {
        const feature = features.find(f => f.id === qw.id)
        if (!feature)
          return null

        return {
          id: feature.id,
          title: feature.title,
          description: feature.description,
          reason: qw.reason,
          estimatedEffort: qw.estimatedEffort,
          estimatedImpact: qw.estimatedImpact,
        }
      })
      .filter(qw => qw !== null) as QuickWin[]

    return { quickWins }
  }

  /**
   * Suggest new features
   *
   * Based on:
   * - Existing features
   * - Identified gaps
   * - Common patterns
   * - User needs
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Feature suggestions
   */
  static async suggestFeatures(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ suggestions: string[] }> {
    // Get full context
    const context = await RAGService.getContextForSpace(contextSpaceId, userId, organizationId)

    // Build prompt
    const systemPrompt = `You are a product management assistant specialized in identifying feature opportunities.

Based on the context space information, suggest 3-5 new features that:
- Fill gaps in the current feature set
- Align with the space's purpose
- Follow common product patterns
- Address potential user needs

Respond with a JSON array of feature suggestions (strings). Each should be a brief, clear feature description.

Example response:
[
  "Add export functionality to allow users to download their data as CSV",
  "Implement user preferences to customize the dashboard layout",
  "Create automated reports that can be scheduled and emailed"
]`

    const userPrompt = `Suggest new features for this context space:\n\n${context}`

    // Get AI provider
    const { provider, source, providerName } = await AIProviderFactory.getProvider(
      userId,
      organizationId,
    )

    // Generate suggestions
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

    // Parse response with Zod
    const suggestions = parseAIResponse(
      response.content,
      suggestFeaturesResponseSchema,
      'feature suggestions',
    )

    if (!suggestions) {
      return { suggestions: [] }
    }

    return { suggestions }
  }

  /**
   * Start a new conversation for context space
   *
   * @param contextSpaceId - Context space ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Conversation ID
   */
  static async startConversation(
    contextSpaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ conversationId: string }> {
    const [conversation] = await db
      .insert(aiConversation)
      .values({
        id: crypto.randomUUID(),
        contextSpaceId,
        userId,
        organizationId,
        type: 'context_space',
        createdAt: new Date(),
      })
      .returning()

    if (!conversation) {
      throw new Error('Failed to create conversation')
    }

    return { conversationId: conversation.id }
  }

  /**
   * Send message in conversation
   *
   * Includes full context of the space in each message for better responses
   *
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param message - User message
   * @returns AI response
   */
  static async sendMessage(
    conversationId: string,
    userId: string,
    organizationId: string,
    message: string,
  ): Promise<{ response: string }> {
    // Get conversation
    const conversation = await db.query.aiConversation.findFirst({
      where: eq(aiConversation.id, conversationId),
    })

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    if (!conversation.contextSpaceId) {
      throw new Error('This conversation is not associated with a context space')
    }

    // Get conversation history
    const messages = await db.query.aiMessage.findMany({
      where: eq(aiMessage.conversationId, conversationId),
      orderBy: (aiMessage, { asc }) => [asc(aiMessage.createdAt)],
    })

    if (!conversation.contextSpaceId) {
      throw new Error('This conversation is not associated with a context space')
    }

    // Get context
    const context = await RAGService.getContextForSpace(
      conversation.contextSpaceId,
      userId,
      organizationId,
    )

    // Build system prompt with context
    const systemPrompt = `You are a helpful product management assistant for a specific context space.

Here is the current context:

${context}

Your role:
- Answer questions about this context space
- Help with product decisions
- Provide insights and recommendations
- Be concise but thorough

Always base your responses on the provided context.`

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
      capability: 'chat' as AICapability,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      credentialSource: source,
      conversationId,
    })

    return { response: response.content }
  }

  /**
   * Get conversation history
   *
   * @param conversationId - Conversation ID
   * @returns Messages in conversation
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
