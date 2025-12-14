<script setup lang="ts">
import type { User } from '@/stores/auth'
import { computed } from 'vue'
import {
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

const { user } = defineProps<{
  user: User
}>()

const initials = computed(() => {
  if (!user || !user.name)
    return ''

  return getInitials(user.name)
})
</script>

<template>
  <AvatarImage v-if="user.image" :src="user.image" :alt="user.name" />
  <AvatarFallback class="rounded-lg">
    {{ initials }}
  </AvatarFallback>
</template>
