import { z } from 'zod'

export const createContextSpaceSchema = z.object({
  name: z
    .string({
      message: 'Context space name is required.',
    })
    .min(2, {
      message: 'Context space name must be at least 2 characters.',
    })
    .max(100, {
      message: 'Context space name must not be longer than 100 characters.',
    }),
  description: z
    .string()
    .max(1000, {
      message: 'Description must not be longer than 1000 characters.',
    })
    .optional(),
  type: z
    .string()
    .max(50, {
      message: 'Type must not be longer than 50 characters.',
    })
    .optional(),
  parentId: z.string().optional(),
})

export const updateContextSpaceSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Context space name must be at least 2 characters.',
    })
    .max(100, {
      message: 'Context space name must not be longer than 100 characters.',
    })
    .optional(),
  description: z
    .string()
    .max(1000, {
      message: 'Description must not be longer than 1000 characters.',
    })
    .optional(),
  type: z
    .string()
    .max(50, {
      message: 'Type must not be longer than 50 characters.',
    })
    .optional(),
  parentId: z.string().nullable().optional(),
})

export type CreateContextSpaceInput = z.infer<typeof createContextSpaceSchema>
export type UpdateContextSpaceInput = z.infer<typeof updateContextSpaceSchema>
