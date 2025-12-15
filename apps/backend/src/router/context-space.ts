import { createContextSpaceSchema, updateContextSpaceSchema } from '@common/schemas/context-space'
import { TRPCError } from '@trpc/server'
import { and, eq, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { contextSpace } from '../db/schema'
import { canDeleteContextSpace, canEditContextSpace, canViewContextSpace, getUserOrganization } from '../services/permissions'
import { authProcedure, router } from '../trpc'

export const contextSpaceRouter = router({
  /**
   * List accessible context spaces
   */
  list: authProcedure
    .input(
      z.object({
        parentId: z.string().optional(),
        includeChildren: z.boolean().optional(),
      }).optional(),
    )
    .query(async ({ input, ctx }) => {
      const userOrg = await getUserOrganization(ctx.user.id)

      if (!userOrg) {
        return []
      }

      const whereConditions = [
        eq(contextSpace.organizationId, userOrg.organizationId),
      ]

      // Filter by parentId if provided
      if (input?.parentId) {
        whereConditions.push(eq(contextSpace.parentId, input.parentId))
      }
      else if (input?.parentId === null || !input?.includeChildren) {
        // Show only root level spaces if no parentId specified
        whereConditions.push(isNull(contextSpace.parentId))
      }

      const spaces = await db
        .select()
        .from(contextSpace)
        .where(and(...whereConditions))
        .orderBy(contextSpace.createdAt)

      return spaces
    }),

  /**
   * Get hierarchical tree of context spaces
   */
  getTree: authProcedure.query(async ({ ctx }) => {
    const userOrg = await getUserOrganization(ctx.user.id)

    if (!userOrg) {
      return []
    }

    const spaces = await db.query.contextSpace.findMany({
      where: eq(contextSpace.organizationId, userOrg.organizationId),
      orderBy: contextSpace.createdAt,
    })

    // Build tree structure
    const spaceMap = new Map(spaces.map(s => [s.id, { ...s, children: [] as any[] }]))
    const tree: any[] = []

    spaces.forEach((space) => {
      const node = spaceMap.get(space.id)
      if (space.parentId) {
        const parent = spaceMap.get(space.parentId)
        if (parent) {
          parent.children.push(node)
        }
        else {
          tree.push(node)
        }
      }
      else {
        tree.push(node)
      }
    })

    return tree
  }),

  /**
   * Get context space by ID
   */
  getById: authProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const canView = await canViewContextSpace(ctx.user.id, input.id)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this context space',
        })
      }

      const space = await db.query.contextSpace.findFirst({
        where: eq(contextSpace.id, input.id),
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          parent: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!space) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Context space not found',
        })
      }

      // Check user permissions
      const canEdit = await canEditContextSpace(ctx.user.id, input.id)
      const canDelete = await canDeleteContextSpace(ctx.user.id, input.id)

      return {
        ...space,
        permissions: {
          canEdit,
          canDelete,
        },
      }
    }),

  /**
   * Get children of a context space
   */
  getChildren: authProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const canView = await canViewContextSpace(ctx.user.id, input.id)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this context space',
        })
      }

      const children = await db
        .select()
        .from(contextSpace)
        .where(eq(contextSpace.parentId, input.id))
        .orderBy(contextSpace.createdAt)

      return children
    }),

  /**
   * Get ancestors (parent chain) of a context space
   */
  getAncestors: authProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const canView = await canViewContextSpace(ctx.user.id, input.id)

      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this context space',
        })
      }

      const ancestors: any[] = []
      let currentId: string | null = input.id

      while (currentId) {
        const [space] = await db
          .select()
          .from(contextSpace)
          .where(eq(contextSpace.id, currentId))
          .limit(1)

        if (!space || !space.parentId) {
          break
        }

        const [parent] = await db
          .select()
          .from(contextSpace)
          .where(eq(contextSpace.id, space.parentId))
          .limit(1)

        if (parent) {
          ancestors.unshift(parent)
          currentId = parent.parentId
        }
        else {
          break
        }
      }

      return ancestors
    }),

  /**
   * Create context space
   */
  create: authProcedure
    .input(createContextSpaceSchema)
    .mutation(async ({ input, ctx }) => {
      const userOrg = await getUserOrganization(ctx.user.id)

      if (!userOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      // If parentId is provided, verify it exists and user has access
      if (input.parentId) {
        const canView = await canViewContextSpace(ctx.user.id, input.parentId)

        if (!canView) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to create a child space here',
          })
        }
      }

      const [newSpace] = await db
        .insert(contextSpace)
        .values({
          id: nanoid(),
          organizationId: userOrg.organizationId,
          name: input.name,
          description: input.description || null,
          type: input.type || null,
          parentId: input.parentId || null,
          createdBy: ctx.user.id,
        })
        .returning()

      return newSpace
    }),

  /**
   * Update context space
   */
  update: authProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateContextSpaceSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const canEdit = await canEditContextSpace(ctx.user.id, input.id)

      if (!canEdit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this context space',
        })
      }

      // If updating parentId, verify new parent exists and user has access
      if (input.data.parentId !== undefined && input.data.parentId !== null) {
        const canView = await canViewContextSpace(ctx.user.id, input.data.parentId)

        if (!canView) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to move to this parent space',
          })
        }

        // Prevent circular references
        if (input.data.parentId === input.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'A context space cannot be its own parent',
          })
        }
      }

      const [updatedSpace] = await db
        .update(contextSpace)
        .set(input.data)
        .where(eq(contextSpace.id, input.id))
        .returning()

      if (!updatedSpace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Context space not found',
        })
      }

      return updatedSpace
    }),

  /**
   * Delete context space
   */
  delete: authProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const canDelete = await canDeleteContextSpace(ctx.user.id, input.id)

      if (!canDelete) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this context space',
        })
      }

      // Check if space has children
      const children = await db
        .select()
        .from(contextSpace)
        .where(eq(contextSpace.parentId, input.id))
        .limit(1)

      if (children.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete a context space with children. Delete children first.',
        })
      }

      await db
        .delete(contextSpace)
        .where(eq(contextSpace.id, input.id))

      return { success: true }
    }),
})
