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

const signUpError = ref<string>()
const { refetchMe } = useAuthStore()

const signupSchema = z.object({
  email: z.email({ error: 'Email must be a valid email address' }),
  password: z.string({ error: 'Required' }).min(8, { error: 'Password must be at least 8 characters long' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords don\'t match',
  path: ['confirmPassword'],
})

const { handleSubmit } = useForm({
  name: 'SignupForm',
  validationSchema: signupSchema,
})

const onSubmit = handleSubmit(async (values) => {
  signUpError.value = undefined

  const { error } = await authClient.signUp.email({
    name: values.email,
    email: values.email,
    password: values.password,
  })

  if (error?.message) {
    signUpError.value = error.message
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
          {{ $t('signup.title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('signup.description') }}
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
              {{ $t('signup.or_continue_with') }}
            </span>
          </div>
        </div>
        <form id="signup" class="space-y-4" @submit.prevent="onSubmit">
          <FormField v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>{{ $t('signup.form.email.label') }}</FormLabel>

              <FormControl>
                <Input data-testid="email-input" required autocomplete="email" type="email" placeholder="email@example.com" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="password">
            <FormItem>
              <FormLabel>{{ $t('signup.form.password.label') }}</FormLabel>

              <FormControl>
                <Input data-testid="password-input" required type="password" autocomplete="new-password" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="confirmPassword">
            <FormItem>
              <FormLabel>{{ $t('signup.form.confirm_password.label') }}</FormLabel>

              <FormControl>
                <Input data-testid="confirm-password-input" required type="password" autocomplete="new-password" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <Error v-if="signUpError" :error="signUpError" />
        </form>
      </CardContent>
      <CardFooter>
        <Button class="w-full" form="signup" data-testid="signup-submit" type="submit">
          {{ $t('signup.form.submit') }}
        </Button>
      </CardFooter>
      <div class="text-center text-sm">
        {{ $t('signup.already_have_account') }}
        <RouterLink data-testid="signin-link" :to="{ name: 'Signin' }" class="underline">
          {{ $t('signup.signin') }}
        </RouterLink>
      </div>
    </Card>
  </div>
</template>
