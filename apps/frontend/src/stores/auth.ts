import type { AsyncReturnType } from 'type-fest'
import { createGlobalState, useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/trpc'

export type User = NonNullable<AsyncReturnType<typeof client.user.me.query>>

export const useAuthStore = createGlobalState(
  <UserRequired extends boolean = false>() => {
    const me = ref<User>()
    const firstLoad = ref(true)

    const router = useRouter()

    function handleUserRedirect(user?: User) {
      const authRoutes = ['/signin', '/signup']
      const currentRoutePath = new URL(window.location.href).pathname

      if (user && authRoutes.includes(currentRoutePath)) {
        return router.push({ name: 'Home' })
      }

      if (!user && !authRoutes.includes(currentRoutePath)) {
        return router.push({ name: 'Signin' })
      }
    }

    const { execute: refetchMe } = useAsyncState(
      () => client.user.me.query(),
      undefined,
      {
        resetOnExecute: false,
        onError: () => {
          firstLoad.value = false
          handleUserRedirect()
          me.value = undefined
        },
        onSuccess: (user) => {
          me.value = user
          firstLoad.value = false

          handleUserRedirect(me.value)
        },
      },
    )

    async function signout() {
      await Promise.all([
        authClient.signOut(),
        handleUserRedirect(),
      ])

      me.value = undefined
    }

    return {
      me: computed(() => me.value as UserRequired extends true ? User : User | undefined),
      firstLoad: computed(() => firstLoad.value),
      refetchMe,
      signout,
    }
  },
)
