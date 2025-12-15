import { z } from 'zod'

/**
 * AI Response Schemas
 *
 * Zod schemas for parsing AI-generated JSON responses
 * Provides type safety and validation
 */

// Duplicate Detection Response
export const duplicateGroupSchema = z.object({
  reason: z.string(),
  similarity: z.number().min(0).max(1),
  features: z.array(z.string()),
})

export const detectDuplicatesResponseSchema = z.array(duplicateGroupSchema)

export type DuplicateGroupRaw = z.infer<typeof duplicateGroupSchema>

// Theme Grouping Response
export const themeGroupSchema = z.object({
  theme: z.string(),
  description: z.string(),
  features: z.array(z.string()),
})

export const groupByThemeResponseSchema = z.array(themeGroupSchema)

export type ThemeGroupRaw = z.infer<typeof themeGroupSchema>

// Quick Wins Response
export const quickWinSchema = z.object({
  id: z.string(),
  reason: z.string(),
  estimatedEffort: z.enum(['low', 'medium']),
  estimatedImpact: z.enum(['medium', 'high']),
})

export const identifyQuickWinsResponseSchema = z.array(quickWinSchema)

export type QuickWinRaw = z.infer<typeof quickWinSchema>

// Feature Suggestions Response
export const suggestFeaturesResponseSchema = z.array(z.string())

export type FeatureSuggestionsRaw = z.infer<typeof suggestFeaturesResponseSchema>
