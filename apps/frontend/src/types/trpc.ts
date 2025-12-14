import type { BackendTrpcRouter } from '@common/index'

import type { TRPCClientError } from '@trpc/client'

export type TRPCError = TRPCClientError<BackendTrpcRouter>
