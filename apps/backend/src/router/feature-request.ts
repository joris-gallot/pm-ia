import { bulkCreateFeatureRequestsSchema, createFeatureRequestSchema, updateFeatureRequestSchema } from '@common/schemas/feature-request'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { featureRequest } from '../db/schema'
import { canEditContextSpace, canViewContextSpace } from '../services/permissions'
import { authProcedure, router } from '../trpc'

export const featureRequestRouter = router({
  /**
   * List feature requests for a context space
   */
  list: authProcedure
    .input(
      z.object({
        contextSpaceId: z.string(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const canView = await canViewContextSpace(ctx.user.id, input.contextSpaceId)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this context space',
        })
      }

      const requests = await db.query.featureRequest.findMany({
        where: eq(featureRequest.contextSpaceId, input.contextSpaceId),
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: (featureRequest, { desc }) => [desc(featureRequest.createdAt)],
      })

      // Filter by tags if provided
      if (input.tags && input.tags.length > 0) {
        return requests.filter((request) => {
          if (!request.tags)
            return false
          return input.tags!.some(tag => request.tags!.includes(tag))
        })
      }

      return requests
    }),

  /**
   * Get feature request by ID
   */
  getById: authProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const request = await db.query.featureRequest.findFirst({
        where: eq(featureRequest.id, input.id),
        with: {
          contextSpace: {
            columns: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Feature request not found',
        })
      }

      const canView = await canViewContextSpace(ctx.user.id, request.contextSpaceId)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this feature request',
        })
      }

      // Check if user can edit (creator or has edit permission on space)
      const canEdit = request.createdBy === ctx.user.id
        || await canEditContextSpace(ctx.user.id, request.contextSpaceId)

      return {
        ...request,
        permissions: {
          canEdit,
          canDelete: canEdit,
        },
      }
    }),

  /**
   * Create feature request
   */
  create: authProcedure
    .input(createFeatureRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const canView = await canViewContextSpace(ctx.user.id, input.contextSpaceId)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create feature requests in this space',
        })
      }

      const [newRequest] = await db
        .insert(featureRequest)
        .values({
          id: nanoid(),
          contextSpaceId: input.contextSpaceId,
          title: input.title,
          description: input.description || null,
          tags: input.tags || null,
          source: 'manual',
          createdBy: ctx.user.id,
        })
        .returning()

      return newRequest
    }),

  /**
   * Bulk create feature requests
   */
  bulkCreate: authProcedure
    .input(bulkCreateFeatureRequestsSchema)
    .mutation(async ({ input, ctx }) => {
      const canView = await canViewContextSpace(ctx.user.id, input.contextSpaceId)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create feature requests in this space',
        })
      }

      const requests = input.requests.map(request => ({
        id: nanoid(),
        contextSpaceId: input.contextSpaceId,
        title: request.title,
        description: request.description || null,
        tags: request.tags || null,
        source: request.source || 'manual',
        createdBy: ctx.user.id,
      }))

      const newRequests = await db
        .insert(featureRequest)
        .values(requests)
        .returning()

      return {
        created: newRequests.length,
        requests: newRequests,
      }
    }),

  /**
   * Update feature request
   */
  update: authProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateFeatureRequestSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existingRequest] = await db
        .select()
        .from(featureRequest)
        .where(eq(featureRequest.id, input.id))
        .limit(1)

      if (!existingRequest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Feature request not found',
        })
      }

      // Check if user can edit (creator or has edit permission on space)
      const canEdit = existingRequest.createdBy === ctx.user.id
        || await canEditContextSpace(ctx.user.id, existingRequest.contextSpaceId)

      if (!canEdit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this feature request',
        })
      }

      const [updatedRequest] = await db
        .update(featureRequest)
        .set(input.data)
        .where(eq(featureRequest.id, input.id))
        .returning()

      return updatedRequest
    }),

  /**
   * Delete feature request
   */
  delete: authProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [existingRequest] = await db
        .select()
        .from(featureRequest)
        .where(eq(featureRequest.id, input.id))
        .limit(1)

      if (!existingRequest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Feature request not found',
        })
      }

      // Check if user can delete (creator or has edit permission on space)
      const canDelete = existingRequest.createdBy === ctx.user.id
        || await canEditContextSpace(ctx.user.id, existingRequest.contextSpaceId)

      if (!canDelete) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this feature request',
        })
      }

      await db
        .delete(featureRequest)
        .where(eq(featureRequest.id, input.id))

      return { success: true }
    }),
})
