<script setup lang="ts">
import { GalleryVerticalEnd, Home, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import NavUser from '@/components/NavUser.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { canAccessRoute } from '@/router/guards'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const { me } = useAuthStore<true>()

const allRoutes = [
  {
    title: t('sidebar.home'),
    name: 'Home',
    icon: Home,
  },
  {
    title: 'Admin Dashboard',
    name: 'AdminDashboard',
    icon: ShieldCheck,
  },
]

const routes = computed(() => {
  return allRoutes.filter(route => canAccessRoute(route.name))
})
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <GalleryVerticalEnd class="size-4" />
            </div>

            <span class="font-semibold">MyApp</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem v-if="!me.subscription">
            <SidebarMenuButton as-child>
              <RouterLink :to="{ name: 'Billing' }">
                <Sparkles />
                <span>{{ $t('sidebar.upgrade_pro') }}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Application</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="route in routes" :key="route.name">
              <SidebarMenuButton as-child :is-active="$route.name === route.name">
                <RouterLink :to="{ name: route.name }">
                  <component :is="route.icon" />
                  <span>{{ route.title }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <NavUser />
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
