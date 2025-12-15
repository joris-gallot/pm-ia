import type { SelectOrganizationMember } from '../db/schema'
import { updateUserSchema } from '@common/schemas/user'
import { eq } from 'drizzle-orm'
import { pick } from 'es-toolkit'
import { nanoid } from 'nanoid'
import { db } from '../db'
import { organization, organizationMember, user } from '../db/schema'
import { getUserOrganization } from '../services/permissions'
import { fetchSubscriptionStatus } from '../services/stripe'
import { authProcedure, router } from '../trpc'

/**
 * Ensures a user has an organization, creating one if needed
 * @param userId - The user's ID
 * @param userName - The user's name (for default org name)
 * @returns The user's organization membership
 */
async function ensureUserHasOrganization(userId: string, userName: string): Promise<Pick<SelectOrganizationMember, 'organizationId' | 'role'>> {
  let userOrg = await getUserOrganization(userId)

  if (!userOrg) {
    // Auto-create organization for new user
    const orgId = nanoid()
    const defaultOrgName = `${userName}'s Organization`

    await db.insert(organization).values({
      id: orgId,
      name: defaultOrgName,
    })

    const [newUserOrg] = await db.insert(organizationMember).values({
      id: nanoid(),
      userId,
      organizationId: orgId,
      role: 'admin',
    }).returning({ organizationId: organizationMember.organizationId, role: organizationMember.role })

    userOrg = newUserOrg!
  }

  return userOrg
}

export const userRouter = router(
  {
    me: authProcedure.query(async ({ ctx }) => {
      const subscription = await fetchSubscriptionStatus(ctx.req.headers)

      const user = pick(ctx.user, ['id', 'name', 'email', 'emailVerified', 'image', 'role'])

      // Get or create organization
      const userOrg = await ensureUserHasOrganization(ctx.user.id, ctx.user.name)

      // Fetch organization details
      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, userOrg.organizationId))
        .limit(1)

      if (!org) {
        throw new Error(`Organization not found for id ${userOrg.organizationId}`)
      }

      return {
        ...user,
        subscription,
        organization: {
          ...org,
          role: userOrg!.role,
        },
      }
    }),
    update: authProcedure.input(updateUserSchema).mutation(async ({ input, ctx }) => {
      const [updatedUser] = await db.update(user).set(input).where(eq(user.id, ctx.user.id)).returning({
        id: user.id,
        name: user.name,
        email: user.email,
      })

      return updatedUser
    }),
  },
)
