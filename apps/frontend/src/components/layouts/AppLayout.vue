<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppSidebar from '@/components/AppSidebar.vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { canAccessRoute } from '@/router/guards'
import Error404 from '@/views/Error404.vue'
import 'vue-sonner/style.css'

const route = useRoute()

const canAccess = computed(() => canAccessRoute(route.name as string))
</script>

<template>
  <Toaster />
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <main class="grow p-3 sm:p-6 lg:p-8">
        <SidebarTrigger class="md:hidden mb-4" />
        <RouterView v-if="canAccess" v-slot="{ Component }">
          <Transition
            enter-active-class="transition-opacity duration-100 ease-in"
            leave-active-class="transition-opacity duration-100 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <component :is="Component" />
          </Transition>
        </RouterView>
        <Error404 v-else />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
