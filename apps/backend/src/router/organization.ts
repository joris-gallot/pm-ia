import { addOrganizationMemberSchema, updateOrganizationMemberRoleSchema } from '@common/schemas/member'
import { updateOrganizationSchema } from '@common/schemas/organization'
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { organization, organizationMember, user } from '../db/schema'
import { canManageOrganization, getUserOrganization } from '../services/permissions'
import { authProcedure, router } from '../trpc'

export const organizationRouter = router({
  /**
   * Update organization
   */
  update: authProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      const userOrg = await getUserOrganization(ctx.user.id)

      if (!userOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      const canManage = await canManageOrganization(ctx.user.id, userOrg.organizationId)

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage this organization',
        })
      }

      const [updatedOrg] = await db
        .update(organization)
        .set(input)
        .where(eq(organization.id, userOrg.organizationId))
        .returning()

      return updatedOrg
    }),

  /**
   * Get organization members
   */
  getMembers: authProcedure.query(async ({ ctx }) => {
    const userOrg = await getUserOrganization(ctx.user.id)

    if (!userOrg) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      })
    }

    const members = await db.query.organizationMember.findMany({
      where: eq(organizationMember.organizationId, userOrg.organizationId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: (organizationMember, { desc }) => [desc(organizationMember.createdAt)],
    })

    return members
  }),

  /**
   * Add member to organization
   */
  addMember: authProcedure
    .input(addOrganizationMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const userOrg = await getUserOrganization(ctx.user.id)

      if (!userOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      const canManage = await canManageOrganization(ctx.user.id, userOrg.organizationId)

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to add members',
        })
      }

      // Find user by email
      const [userToAdd] = await db
        .select()
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1)

      if (!userToAdd) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Check if user is already a member
      const [existingMember] = await db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.userId, userToAdd.id),
            eq(organizationMember.organizationId, userOrg.organizationId),
          ),
        )
        .limit(1)

      if (existingMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already a member of this organization',
        })
      }

      // Add user as member
      const [newMember] = await db
        .insert(organizationMember)
        .values({
          id: nanoid(),
          userId: userToAdd.id,
          organizationId: userOrg.organizationId,
          role: input.role,
        })
        .returning()

      return newMember
    }),

  /**
   * Remove member from organization
   */
  removeMember: authProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userOrg = await getUserOrganization(ctx.user.id)

      if (!userOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      const canManage = await canManageOrganization(ctx.user.id, userOrg.organizationId)

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to remove members',
        })
      }

      // Get member to remove
      const [memberToRemove] = await db
        .select()
        .from(organizationMember)
        .where(eq(organizationMember.id, input.memberId))
        .limit(1)

      if (!memberToRemove) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Prevent removing yourself if you're the last admin
      if (memberToRemove.userId === ctx.user.id && memberToRemove.role === 'admin') {
        const admins = await db
          .select()
          .from(organizationMember)
          .where(
            and(
              eq(organizationMember.organizationId, userOrg.organizationId),
              eq(organizationMember.role, 'admin'),
            ),
          )

        if (admins.length === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove the last admin',
          })
        }
      }

      await db
        .delete(organizationMember)
        .where(eq(organizationMember.id, input.memberId))

      return { success: true }
    }),

  /**
   * Update organization member role
   */
  updateMemberRole: authProcedure
    .input(
      z.object({
        memberId: z.string(),
        data: updateOrganizationMemberRoleSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userOrg = await getUserOrganization(ctx.user.id)

      if (!userOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      const canManage = await canManageOrganization(ctx.user.id, userOrg.organizationId)

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update member roles',
        })
      }

      // Get member to update
      const [memberToUpdate] = await db
        .select()
        .from(organizationMember)
        .where(eq(organizationMember.id, input.memberId))
        .limit(1)

      if (!memberToUpdate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Prevent demoting yourself if you're the last admin
      if (
        memberToUpdate.userId === ctx.user.id
        && memberToUpdate.role === 'admin'
        && input.data.role !== 'admin'
      ) {
        const admins = await db
          .select()
          .from(organizationMember)
          .where(
            and(
              eq(organizationMember.organizationId, userOrg.organizationId),
              eq(organizationMember.role, 'admin'),
            ),
          )

        if (admins.length === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot demote the last admin',
          })
        }
      }

      const [updatedMember] = await db
        .update(organizationMember)
        .set({ role: input.data.role })
        .where(eq(organizationMember.id, input.memberId))
        .returning()

      return updatedMember
    }),
})
