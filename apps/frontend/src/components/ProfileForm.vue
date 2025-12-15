<script setup lang="ts">
import { updateUserSchema } from '@common/schemas/user'
import { BadgeCheck, TriangleAlert } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { client } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const { me, refetchMe } = useAuthStore<true>()

const { handleSubmit, resetForm, meta, isSubmitting } = useForm({
  name: 'ProfileForm',
  validationSchema: updateUserSchema,
  initialValues: {
    email: me.value.email,
    name: me.value.name,
  },
})

const onSubmit = handleSubmit(async (values) => {
  const user = await client.user.update.mutate(values)

  refetchMe()
  resetForm({ values: user })
  toast.success(t('account.profile.toast.success'), {
    description: t('account.profile.toast.success_description'),
  })
})
</script>

<template>
  <form class="space-y-8" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>{{ $t('account.profile.form.username.label') }}</FormLabel>
        <FormControl>
          <Input type="text" placeholder="myname" v-bind="componentField" />
        </FormControl>
        <FormMessage />
        <FormDescription>
          {{ $t('account.profile.form.username.description') }}
        </FormDescription>
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>{{ $t('account.profile.form.email.label') }}</FormLabel>

        <FormControl>
          <Input type="text" placeholder="example@domain.com" v-bind="componentField" />
        </FormControl>
        <FormMessage />
        <FormDescription>
          <div v-if="me?.emailVerified" class="flex items-center gap-1 text-green-600">
            <BadgeCheck class="size-4" />
            {{ $t('account.profile.form.email.verified') }}
          </div>
          <div v-else class="flex items-center gap-1 text-amber-600">
            <TriangleAlert class="size-4" />
            {{ $t('account.profile.form.email.not_verified') }}
          </div>
        </FormDescription>
      </FormItem>
    </FormField>

    <div class="flex gap-2 justify-start">
      <Button type="submit" :disabled="isSubmitting || !meta.dirty">
        {{ $t('account.profile.form.submit') }}
      </Button>

      <Button
        type="button"
        variant="outline"
        :disabled="isSubmitting || !meta.dirty"
        @click="resetForm"
      >
        {{ $t('account.profile.form.reset') }}
      </Button>
    </div>
  </form>
</template>
