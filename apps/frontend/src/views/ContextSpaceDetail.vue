<script setup lang="ts">
import { useAsyncState } from '@vueuse/core'
import { Box, Edit, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useContextSpaceStore } from '@/stores/context-space'

const route = useRoute()
const contextSpaceStore = useContextSpaceStore()

const spaceId = route.params.id as string

const { isLoading: loading } = useAsyncState(
  contextSpaceStore.getById(spaceId),
  null,
)

const currentSpace = computed(() => contextSpaceStore.currentSpace.value)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div v-if="loading">
      <Skeleton class="h-10 w-64 mb-2" />
      <Skeleton class="h-4 w-96" />
    </div>
    <div v-else-if="currentSpace" class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3">
          <Box class="h-8 w-8 text-primary" />
          <h1 class="text-3xl font-bold">
            {{ currentSpace.name }}
          </h1>
        </div>
        <p v-if="currentSpace.type" class="text-sm text-muted-foreground mt-2 uppercase">
          {{ currentSpace.type }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          v-if="currentSpace.permissions?.canEdit"
          variant="outline"
          size="sm"
        >
          <Edit class="mr-2 h-4 w-4" />
          {{ $t('context_space.edit') }}
        </Button>
        <Button
          v-if="currentSpace.permissions?.canDelete"
          variant="outline"
          size="sm"
        >
          <Trash2 class="mr-2 h-4 w-4" />
          {{ $t('context_space.delete') }}
        </Button>
      </div>
    </div>

    <!-- Description -->
    <Card v-if="!loading && currentSpace?.description">
      <CardHeader>
        <CardTitle class="text-lg">
          {{ $t('context_space.form.description.label') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-muted-foreground whitespace-pre-wrap">
          {{ currentSpace.description }}
        </p>
      </CardContent>
    </Card>

    <!-- Metadata -->
    <Card v-if="!loading && currentSpace">
      <CardHeader>
        <CardTitle class="text-lg">
          {{ $t('context_space.detail.created_by') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">{{ $t('context_space.detail.created_by') }}</span>
          <span class="font-medium">{{ currentSpace.creator?.name }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">{{ $t('context_space.detail.created_at') }}</span>
          <span class="font-medium">
            {{ new Date(currentSpace.createdAt).toLocaleDateString() }}
          </span>
        </div>
        <div v-if="currentSpace.parent" class="flex justify-between">
          <span class="text-muted-foreground">{{ $t('context_space.detail.parent') }}</span>
          <span class="font-medium">{{ currentSpace.parent.name }}</span>
        </div>
      </CardContent>
    </Card>

    <!-- Feature Requests -->
    <Card v-if="!loading">
      <CardHeader>
        <CardTitle class="text-lg">
          {{ $t('feature_request.title') }}
        </CardTitle>
        <CardDescription>
          Manage feature requests for this space
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button as-child>
          <RouterLink :to="{ name: 'FeatureRequests', params: { id: spaceId } }">
            {{ $t('context_space.detail.feature_requests') }}
          </RouterLink>
        </Button>
      </CardContent>
    </Card>

    <!-- Loading Skeletons -->
    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-32 w-full" />
      <Skeleton class="h-32 w-full" />
    </div>
  </div>
</template>
