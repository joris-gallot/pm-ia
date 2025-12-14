<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="flex min-h-[70vh] flex-col items-center justify-center text-center">
    <h1 class="text-9xl font-bold text-primary">
      404
    </h1>
    <h2 class="mt-4 text-3xl font-semibold">
      {{ $t('error404.title') }}
    </h2>
    <p class="mt-2 text-lg text-muted-foreground">
      {{ $t('error404.description') }}
    </p>
    <RouterLink :to="{ name: 'Home' }">
      <Button class="mt-8">
        {{ $t('error404.go_home') }}
      </Button>
    </RouterLink>
  </div>
</template>
