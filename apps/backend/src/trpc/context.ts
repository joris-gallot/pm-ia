import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { AsyncReturnType } from 'type-fest'
import type { AuthType } from '../lib/auth.js'
import { auth } from '../lib/auth.js'

export async function createContext({
  req,
}: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({ headers: req.headers })
  const user = (session?.user as AuthType['user']) ?? null

  return {
    user,
    req,
  }
}

export type Context = AsyncReturnType<typeof createContext>
