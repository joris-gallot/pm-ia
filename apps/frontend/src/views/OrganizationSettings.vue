<script setup lang="ts">
import type { OrganizationRole } from '@common/constants'
import type { BadgeVariants } from '@/components/ui/badge'
import { useAsyncState } from '@vueuse/core'
import { Building2, Users } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { client } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth'

const { me, refetchMe } = useAuthStore<true>()

const formSchema = z.object({
  name: z.string().min(2).max(100),
})

const organization = computed(() => me.value.organization)

const { handleSubmit, resetForm, isSubmitting, meta } = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: organization.value.name,
  },
})

const onSubmit = handleSubmit(async (values) => {
  try {
    await client.organization.update.mutate(values)
    await refetchMe()

    toast.success('Success', {
      description: 'Organization settings updated successfully',
    })
  }
  catch {
    toast.error('Error', {
      description: 'Failed to update organization settings',
    })
  }
})

const { state: members, isLoading: loadingMembers } = useAsyncState(
  client.organization.getMembers.query(),
  [],
)

function getRoleBadgeVariant(role: OrganizationRole) {
  const roleVariants: Record<OrganizationRole, BadgeVariants['variant']> = {
    admin: 'default',
    manager: 'secondary',
    member: 'outline',
  }

  return roleVariants[role]
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        {{ $t('organization.settings') }}
      </h1>
      <p class="text-muted-foreground mt-2">
        Manage your organization settings and members
      </p>
    </div>

    <Tabs default-value="general" :unmount-on-hide="false">
      <TabsList>
        <TabsTrigger value="general">
          <Building2 class="mr-2 h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="members">
          <Users class="mr-2 h-4 w-4" />
          Members
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" class="space-y-4">
        <Card>
          <CardHeader>
            <div class="flex items-center gap-3">
              <Building2 class="h-6 w-6" />
              <div>
                <CardTitle>{{ $t('organization.title') }}</CardTitle>
                <CardDescription>
                  Update your organization information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form class="space-y-4" @submit="onSubmit">
              <FormField v-slot="{ componentField }" name="name">
                <FormItem>
                  <FormLabel>{{ $t('organization.form.name.label') }}</FormLabel>
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      :placeholder="$t('organization.form.name.placeholder')"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <div class="flex gap-2">
                <Button type="submit" :disabled="isSubmitting || !meta.dirty">
                  {{ $t('organization.form.submit') }}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isSubmitting || !meta.dirty"
                  @click="resetForm()"
                >
                  {{ $t('organization.form.cancel') }}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold">
              {{ $t('organization.members') }}
            </h2>
            <p class="text-muted-foreground text-sm mt-1">
              {{ $t('organization.members_list.description') }}
            </p>
          </div>
          <Button>
            {{ $t('organization.members_list.invite') }}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div class="flex items-center gap-3">
              <Users class="h-6 w-6" />
              <div>
                <CardTitle>{{ $t('organization.members_list.title') }}</CardTitle>
                <CardDescription>
                  {{ members?.length || 0 }} member{{ members?.length !== 1 ? 's' : '' }}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="loadingMembers" class="space-y-2">
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-12 w-full" />
            </div>

            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead class="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="member in members" :key="member.id">
                  <TableCell class="font-medium">
                    {{ member.user.name }}
                  </TableCell>
                  <TableCell>{{ member.user.email }}</TableCell>
                  <TableCell>
                    <Badge :variant="getRoleBadgeVariant(member.role)">
                      {{ $t(`organization.members_list.role.${member.role}`) }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {{ new Date(member.createdAt).toLocaleDateString() }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button variant="ghost" size="sm">
                      {{ $t('organization.members_list.change_role') }}
                    </Button>
                    <Button variant="ghost" size="sm">
                      {{ $t('organization.members_list.remove') }}
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
