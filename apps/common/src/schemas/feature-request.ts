import { z } from 'zod'
import { FEATURE_REQUEST_SOURCES } from '../constants'

export const createFeatureRequestSchema = z.object({
  contextSpaceId: z.string({
    message: 'Context space ID is required.',
  }),
  title: z
    .string({
      message: 'Title is required.',
    })
    .min(2, {
      message: 'Title must be at least 2 characters.',
    })
    .max(200, {
      message: 'Title must not be longer than 200 characters.',
    }),
  description: z
    .string()
    .max(5000, {
      message: 'Description must not be longer than 5000 characters.',
    })
    .optional(),
  tags: z.array(z.string()).optional(),
})

export const updateFeatureRequestSchema = z.object({
  title: z
    .string()
    .min(2, {
      message: 'Title must be at least 2 characters.',
    })
    .max(200, {
      message: 'Title must not be longer than 200 characters.',
    })
    .optional(),
  description: z
    .string()
    .max(5000, {
      message: 'Description must not be longer than 5000 characters.',
    })
    .optional(),
  tags: z.array(z.string()).optional(),
})

export const bulkCreateFeatureRequestsSchema = z.object({
  contextSpaceId: z.string({
    message: 'Context space ID is required.',
  }),
  requests: z.array(
    z.object({
      title: z.string().min(2).max(200),
      description: z.string().max(5000).optional(),
      tags: z.array(z.string()).optional(),
      source: z.enum(FEATURE_REQUEST_SOURCES).optional(),
    }),
  ).min(1, {
    message: 'At least one feature request is required.',
  }),
})

export type CreateFeatureRequestInput = z.infer<typeof createFeatureRequestSchema>
export type UpdateFeatureRequestInput = z.infer<typeof updateFeatureRequestSchema>
export type BulkCreateFeatureRequestsInput = z.infer<typeof bulkCreateFeatureRequestsSchema>
