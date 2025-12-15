import { z } from 'zod'
import { ORGANIZATION_ROLES } from '../constants'

export const addOrganizationMemberSchema = z.object({
  email: z
    .string({
      message: 'Email is required.',
    })
    .email({
      message: 'Must be a valid email address.',
    }),
  role: z.enum(ORGANIZATION_ROLES, {
    message: 'Role must be admin, manager, or member.',
  }),
})

export const updateOrganizationMemberRoleSchema = z.object({
  role: z.enum(ORGANIZATION_ROLES, {
    message: 'Role must be admin, manager, or member.',
  }),
})

export type AddOrganizationMemberInput = z.infer<typeof addOrganizationMemberSchema>
export type UpdateOrganizationMemberRoleInput = z.infer<typeof updateOrganizationMemberRoleSchema>
