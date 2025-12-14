import { auth } from '../lib/auth'

interface SubscriptionStatus {
  id: string
  status: string
  periodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export async function fetchSubscriptionStatus(headers: HeadersInit): Promise<SubscriptionStatus | null> {
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers,
  })

  const activeSubscription = subscriptions?.find(
    sub => sub.status === 'active' || sub.status === 'trialing',
  )

  if (!activeSubscription) {
    return null
  }

  return {
    id: activeSubscription.id,
    status: activeSubscription.status,
    periodEnd: activeSubscription.periodEnd || null,
    cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd || false,
  }
}
