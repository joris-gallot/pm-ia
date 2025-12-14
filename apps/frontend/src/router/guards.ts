import type { User } from '@/stores/auth'
import { useAuthStore } from '@/stores/auth'

interface RouteGuardContext {
  user: User
}

interface RouteGuards {
  [routeName: string]: (context: RouteGuardContext) => boolean
}

const routeGuards: RouteGuards = {
  AdminDashboard: ({ user }) => user.role === 'admin',
  Home: () => true,
  Account: () => true,
  Billing: () => true,
  Signin: () => true,
  Signup: () => true,
  Error404: () => true,
}

export function canAccessRoute(
  routeName: string,
  user: User = useAuthStore<true>().me.value,
): boolean {
  const guard = routeGuards[routeName]

  if (!guard) {
    throw new Error(`No guard defined for route: ${routeName}`)
  }

  return guard({ user })
}
