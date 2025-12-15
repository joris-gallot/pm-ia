import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z
    .string({
      message: 'Organization name is required.',
    })
    .min(2, {
      message: 'Organization name must be at least 2 characters.',
    })
    .max(100, {
      message: 'Organization name must not be longer than 100 characters.',
    }),
})

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Organization name must be at least 2 characters.',
    })
    .max(100, {
      message: 'Organization name must not be longer than 100 characters.',
    })
    .optional(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
