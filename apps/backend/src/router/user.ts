import { updateUserSchema } from '@common/schemas/user'
import { eq } from 'drizzle-orm'
import { pick } from 'es-toolkit'
import { db } from '../db'
import { user } from '../db/schema'
import { fetchSubscriptionStatus } from '../services/stripe'
import { authProcedure, router } from '../trpc'

export const userRouter = router(
  {
    me: authProcedure.query(async ({ ctx }) => {
      const subscription = await fetchSubscriptionStatus(ctx.req.headers)

      const user = pick(ctx.user, ['id', 'name', 'email', 'emailVerified', 'image', 'role'])

      return {
        ...user,
        subscription,
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
