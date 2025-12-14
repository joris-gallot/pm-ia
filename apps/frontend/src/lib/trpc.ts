import type { BackendTrpcRouter } from '@common/index'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

import { BACKEND_URL } from './constants'

export const client = createTRPCProxyClient<BackendTrpcRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
    }),
  ],
})
