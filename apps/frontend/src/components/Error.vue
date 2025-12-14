<script lang="ts" setup>
import type { TRPCError } from '@/types/trpc'
import { CircleAlert } from 'lucide-vue-next'
import { computed } from 'vue'

const { error, trpcError } = defineProps<{
  trpcError?: TRPCError
  error?: string
}>()

const errors = computed(() => {
  if (error) {
    return [{ message: error, code: 'UNKNOWN', path: [] }]
  }

  if (!trpcError) {
    return []
  }

  try {
    return JSON.parse(trpcError.message) as Array<{ message: string, code: string, path: string[] }>
  }
  catch (e) {
    console.error('Failed to parse error message:', e)
    return []
  }
})
</script>

<template>
  <div class="flex items-start gap-2 rounded-lg border border-destructive p-4 text-red-500">
    <CircleAlert class="mt-0.5 size-4" />

    <div class="flex-1 space-y-2">
      <h3 class="text-sm font-medium ">
        Error
      </h3>

      <ul v-if="errors.length" class="text-sm" :class="{ 'list-disc': errors.length > 1 }">
        <li v-for="(err, index) in errors" :key="index">
          {{ err.message }}
        </li>
      </ul>
    </div>
  </div>
</template>
