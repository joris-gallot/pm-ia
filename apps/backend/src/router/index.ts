import { router } from '../trpc'
import { contextSpaceRouter } from './context-space'
import { featureRequestRouter } from './feature-request'
import { organizationRouter } from './organization'
import { userRouter } from './user'

export const appRouter = router({
  user: userRouter,
  organization: organizationRouter,
  contextSpace: contextSpaceRouter,
  featureRequest: featureRequestRouter,
})

export type AppRouter = typeof appRouter
