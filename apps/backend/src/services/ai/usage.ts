import type { AICapability, AIProvider, CredentialSource } from '@common/constants'
import { isDev } from '../../lib/env'
import { logger } from '../../lib/logger'

/**
 * AI Usage Tracking Service
 *
 * TODO (after DB schema): Implement full usage tracking
 * - Log all AI API calls to ai_usage_log table
 * - Calculate costs based on ai_model_config
 * - Track tokens per user/organization
 * - Generate usage reports
 * - Enforce usage limits
 */

interface LogUsageParams {
  userId: string
  organizationId: string
  provider: AIProvider
  modelId: string
  capability: AICapability
  tokensInput: number
  tokensOutput: number
  credentialSource: CredentialSource
  conversationId?: string
}

export class AIUsageService {
  /**
   * Log AI API usage
   *
   * TODO: Implement after ai_usage_log table is created
   * - Insert record into ai_usage_log
   * - Calculate cost from ai_model_config
   * - Update running totals
   * - Check usage limits
   */
  static async logUsage(_params: LogUsageParams): Promise<void> {
    // TODO: Implement database logging
    // const cost = await this.calculateCost(params.provider, params.modelId, params.tokensInput, params.tokensOutput)
    //
    // await db.insert(aiUsageLog).values({
    //   id: crypto.randomUUID(),
    //   userId: params.userId,
    //   organizationId: params.organizationId,
    //   provider: params.provider,
    //   modelId: params.modelId,
    //   capability: params.capability,
    //   tokensInput: params.tokensInput,
    //   tokensOutput: params.tokensOutput,
    //   cost,
    //   credentialSource: params.credentialSource,
    //   conversationId: params.conversationId,
    //   createdAt: new Date(),
    // })

    // For now: just log to console in development
    if (isDev) {
      logger.info({
        provider: _params.provider,
        model: _params.modelId,
        tokensIn: _params.tokensInput,
        tokensOut: _params.tokensOutput,
        source: _params.credentialSource,
      }, '[AI Usage]')
    }
  }

  /**
   * Calculate cost for AI API call
   *
   * TODO: Implement after ai_model_config table is created
   * - Lookup model pricing from ai_model_config
   * - Calculate: (tokensInput / 1000) * costPer1kInput + (tokensOutput / 1000) * costPer1kOutput
   * - Return 0 for Ollama (free)
   */
  private static async calculateCost(
    _provider: AIProvider,
    _modelId: string,
    _tokensInput: number,
    _tokensOutput: number,
  ): Promise<number> {
    // TODO: Implement
    // const modelConfig = await db.query.aiModelConfig.findFirst({
    //   where: and(
    //     eq(aiModelConfig.provider, provider),
    //     eq(aiModelConfig.modelId, modelId)
    //   ),
    // })
    //
    // if (!modelConfig?.costPer1kTokensInput || !modelConfig?.costPer1kTokensOutput) {
    //   return 0 // Free (e.g., Ollama)
    // }
    //
    // const inputCost = (tokensInput / 1000) * modelConfig.costPer1kTokensInput
    // const outputCost = (tokensOutput / 1000) * modelConfig.costPer1kTokensOutput
    //
    // return inputCost + outputCost

    return 0 // Placeholder
  }

  /**
   * Get user usage statistics
   *
   * TODO: Implement after ai_usage_log table is created
   * - Query ai_usage_log for date range
   * - Aggregate by provider, model, capability
   * - Calculate total cost
   */
  static async getUserUsage(
    _userId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<unknown> {
    // TODO: Implement
    return []
  }

  /**
   * Get organization usage statistics
   *
   * TODO: Implement after ai_usage_log table is created
   * - Query ai_usage_log for date range
   * - Aggregate by user, provider, model
   * - Calculate total cost per user
   */
  static async getOrganizationUsage(
    _organizationId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<unknown> {
    // TODO: Implement
    return []
  }
}
