<script setup lang="ts">
import { FileText, Plus } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const route = useRoute()
const spaceId = route.params.id as string

const featureRequests = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  // TODO: Fetch feature requests
  loading.value = false
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('feature_request.title') }}
        </h1>
        <p class="text-muted-foreground mt-2">
          Manage feature requests for this space
        </p>
      </div>
      <Button>
        <Plus class="mr-2 h-4 w-4" />
        {{ $t('feature_request.create') }}
      </Button>
    </div>

    <!-- Empty State -->
    <div v-if="featureRequests.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <FileText class="h-12 w-12 text-muted-foreground mb-4" />
      <h3 class="text-lg font-semibold mb-2">
        {{ $t('feature_request.empty_state.title') }}
      </h3>
      <p class="text-muted-foreground mb-4">
        {{ $t('feature_request.empty_state.description') }}
      </p>
      <Button>
        <Plus class="mr-2 h-4 w-4" />
        {{ $t('feature_request.empty_state.action') }}
      </Button>
    </div>

    <!-- Feature Requests List -->
    <div v-else class="space-y-4">
      <Card
        v-for="request in featureRequests"
        :key="request.id"
        class="cursor-pointer hover:border-primary transition-colors"
      >
        <CardHeader>
          <CardTitle>{{ request.title }}</CardTitle>
          <CardDescription v-if="request.tags?.length">
            <div class="flex gap-2 mt-2">
              <span
                v-for="tag in request.tags"
                :key="tag"
                class="px-2 py-1 bg-secondary text-xs rounded"
              >
                {{ tag }}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent v-if="request.description">
          <p class="text-sm text-muted-foreground line-clamp-2">
            {{ request.description }}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
