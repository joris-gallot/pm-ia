<script setup lang="ts">
import { useForm } from 'vee-validate'
import { ref } from 'vue'

import { z } from 'zod'
import Error from '@/components/Error.vue'
import OAuthSignIn from '@/components/OAuthSignIn.vue'
import { Button } from '@/components/ui/button'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/stores/auth'

const signinSchema = z.object({
  email: z.email({ error: 'Email must be a valid email address' }),
  password: z.string({ error: 'Required' }),
})

const signInError = ref<string>()
const { refetchMe } = useAuthStore()

const { handleSubmit } = useForm({
  name: 'SignupForm',
  validationSchema: signinSchema,
})

const onSubmit = handleSubmit(async (values) => {
  signInError.value = undefined

  const { error } = await authClient.signIn.email({
    email: values.email,
    password: values.password,
  })

  if (error?.message) {
    signInError.value = error.message

    return
  }

  refetchMe()
})
</script>

<template>
  <div class="container mx-auto h-screen flex justify-center items-center sm:px-0 px-2">
    <Card class="w-[500px]">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl">
          {{ $t('signin.title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('signin.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4">
        <OAuthSignIn />
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">
              {{ $t('signin.or_continue_with') }}
            </span>
          </div>
        </div>
        <form id="signin-form" class="space-y-4" @submit.prevent="onSubmit">
          <FormField v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>{{ $t('signin.form.email.label') }}</FormLabel>

              <FormControl>
                <Input data-testid="email-input" required autocomplete="email" type="email" placeholder="email@example.com" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="password">
            <FormItem>
              <FormLabel>{{ $t('signin.form.password.label') }}</FormLabel>

              <FormControl>
                <Input data-testid="password-input" required type="password" autocomplete="current-password" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <Error v-if="signInError" :error="signInError" />
        </form>
      </CardContent>
      <CardFooter>
        <Button class="w-full" form="signin-form" data-testid="signin-submit" type="submit">
          {{ $t('signin.form.submit') }}
        </Button>
      </CardFooter>
      <div class="text-center text-sm">
        {{ $t('signin.have_account') }}
        <RouterLink data-testid="signup-link" :to="{ name: 'Signup' }" class="underline">
          {{ $t('signin.signup') }}
        </RouterLink>
      </div>
    </Card>
  </div>
</template>
