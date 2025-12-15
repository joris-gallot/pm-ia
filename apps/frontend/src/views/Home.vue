<script setup lang="ts">
import { useAsyncState } from '@vueuse/core'
import { Box, Plus } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useContextSpaceStore } from '@/stores/context-space'

const contextSpaceStore = useContextSpaceStore()

const showCreateDialog = ref(false)
const tree = computed(() => contextSpaceStore.tree.value || [])

useAsyncState(
  contextSpaceStore.fetchTree(),
  null,
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('context_space.title') }}
        </h1>
        <p class="text-muted-foreground mt-2">
          {{ $t('context_space.empty_state.description') }}
        </p>
      </div>
      <Button @click="showCreateDialog = true">
        <Plus class="mr-2 h-4 w-4" />
        {{ $t('context_space.create') }}
      </Button>
    </div>

    <!-- Empty State -->
    <div v-if="tree.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <Box class="h-12 w-12 text-muted-foreground mb-4" />
      <h3 class="text-lg font-semibold mb-2">
        {{ $t('context_space.empty_state.title') }}
      </h3>
      <p class="text-muted-foreground mb-4">
        {{ $t('context_space.empty_state.description') }}
      </p>
      <Button @click="showCreateDialog = true">
        <Plus class="mr-2 h-4 w-4" />
        {{ $t('context_space.empty_state.action') }}
      </Button>
    </div>

    <!-- Context Spaces Grid -->
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="space in tree"
        :key="space.id"
        :to="{ name: 'ContextSpaceDetail', params: { id: space.id } }"
        class="block"
      >
        <Card class="cursor-pointer hover:border-primary transition-colors h-full">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Box class="h-5 w-5" />
              {{ space.name }}
            </CardTitle>
            <CardDescription v-if="space.type" class="text-xs uppercase">
              {{ space.type }}
            </CardDescription>
          </CardHeader>
          <CardContent v-if="space.description">
            <p class="text-sm text-muted-foreground line-clamp-2">
              {{ space.description }}
            </p>
          </CardContent>
        </Card>
      </RouterLink>
    </div>
  </div>
</template>
