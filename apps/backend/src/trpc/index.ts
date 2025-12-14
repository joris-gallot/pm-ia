import type { ErrorDetail } from '../error'
import type { Context } from './context'
import * as Sentry from '@sentry/node'
import { initTRPC, TRPCError } from '@trpc/server'

import { logger } from '../lib/logger'

export const t = initTRPC.context<Context>().create()

const sentryMiddleware = t.middleware(
  Sentry.trpcMiddleware({
    attachRpcInput: true,
  }),
)

const sentrifiedProcedure = t.procedure.use(sentryMiddleware)

const loggedProcedure = sentrifiedProcedure.use(async (opts) => {
  const start = Date.now()

  const result = await opts.next()

  const durationMs = Date.now() - start
  const log = `${opts.type} ${opts.path} - ${durationMs}ms`

  if (result.ok) {
    logger.info(log)
  }
  else {
    // if the error message is a stringified array from formatErrors
    if (result.error.message.startsWith('[')) {
      const errors = (JSON.parse(result.error.message)) as ErrorDetail[]
      const error = errors.map(e => e.message)
      logger.error({ error }, log)
    }
    else {
      logger.error({ error: result.error.message }, log)
    }
  }

  return result
})

export const publicProcedure = loggedProcedure

export const authProcedure = loggedProcedure.use(
  async (opts) => {
    const { ctx } = opts

    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return opts.next({
      ctx: {
        user: ctx.user,
      },
    })
  },
)

export const router = t.router
