import type { AsyncReturnType } from 'type-fest'
import { createGlobalState, useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { client } from '@/lib/trpc'

export type ContextSpace = NonNullable<
  AsyncReturnType<typeof client.contextSpace.getById.query>
>

export type ContextSpaceListItem = AsyncReturnType<
  typeof client.contextSpace.list.query
>[number]

export type ContextSpaceTree = AsyncReturnType<typeof client.contextSpace.getTree.query>

export const useContextSpaceStore = createGlobalState(() => {
  const currentSpace = ref<ContextSpace>()
  const spaces = ref<ContextSpaceListItem[]>([])
  const tree = ref<ContextSpaceTree>([])
  const loading = ref(false)

  const { execute: fetchList } = useAsyncState(
    (parentId?: string) => client.contextSpace.list.query({ parentId }),
    undefined,
    {
      immediate: false,
      resetOnExecute: false,
      onSuccess: (data) => {
        spaces.value = data || []
      },
    },
  )

  const { execute: fetchTree } = useAsyncState(
    () => client.contextSpace.getTree.query(),
    undefined,
    {
      immediate: false,
      resetOnExecute: false,
      onSuccess: (data) => {
        if (data) {
          tree.value = data
        }
      },
    },
  )

  async function getById(id: string) {
    const space = await client.contextSpace.getById.query({ id })
    currentSpace.value = space
    return space
  }

  async function createSpace(data: {
    name: string
    description?: string
    type?: string
    parentId?: string
  }) {
    const newSpace = await client.contextSpace.create.mutate(data)

    // Refresh tree after creation
    await fetchTree()

    return newSpace
  }

  async function updateSpace(id: string, data: {
    name?: string
    description?: string
    type?: string
    parentId?: string | null
  }) {
    const updated = await client.contextSpace.update.mutate({ id, data })

    // Update current space if it's the one being updated
    if (currentSpace.value?.id === id) {
      currentSpace.value = { ...currentSpace.value, ...updated }
    }

    // Refresh tree after update
    await fetchTree()

    return updated
  }

  async function deleteSpace(id: string) {
    await client.contextSpace.delete.mutate({ id })

    // Clear current space if deleted
    if (currentSpace.value?.id === id) {
      currentSpace.value = undefined
    }

    // Refresh tree after deletion
    await fetchTree()
  }

  function reset() {
    currentSpace.value = undefined
    spaces.value = []
    tree.value = []
  }

  return {
    currentSpace: computed(() => currentSpace.value),
    spaces: computed(() => spaces.value),
    tree: computed(() => tree.value),
    loading: computed(() => loading.value),
    fetchList,
    fetchTree,
    getById,
    createSpace,
    updateSpace,
    deleteSpace,
    reset,
  }
})
