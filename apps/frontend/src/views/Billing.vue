<script setup lang="ts">
import { Check, CreditCard, Loader2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/stores/auth'

const { me } = useAuthStore<true>()
const isCreatingCheckout = ref(false)
const isOpeningPortal = ref(false)

async function handleSubscribe() {
  try {
    isCreatingCheckout.value = true
    const baseUrl = window.location.origin

    const { error } = await authClient.subscription.upgrade({
      plan: 'pro',
      successUrl: `${baseUrl}/billing?success=true`,
      cancelUrl: `${baseUrl}/billing?canceled=true`,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Better Auth will redirect automatically
  }
  catch {
    toast.error('Error', {
      description: 'Failed to create checkout session',
    })
    isCreatingCheckout.value = false
  }
}

async function handleManageBilling() {
  try {
    isOpeningPortal.value = true
    const baseUrl = window.location.origin

    const { error } = await authClient.subscription.billingPortal({
      returnUrl: `${baseUrl}/billing`,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Better Auth will redirect automatically
  }
  catch {
    toast.error('Error', {
      description: 'Failed to open billing portal',
    })
    isOpeningPortal.value = false
  }
}

function formatDate(date: string | Date | null) {
  if (!date)
    return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(async () => {
  // Check for success/cancel query params
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('success') === 'true') {
    toast.success('Success!', {
      description: 'Your subscription has been activated.',
    })

    // Remove query params
    window.history.replaceState({}, '', '/billing')
  }
  else if (urlParams.get('canceled') === 'true') {
    toast.error('Canceled', {
      description: 'Subscription checkout was canceled.',
    })

    // Remove query params
    window.history.replaceState({}, '', '/billing')
  }
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold">
      {{ $t('billing.title') }}
    </h1>

    <p class="text-muted-foreground">
      {{ $t('billing.description') }}
    </p>

    <Separator />

    <div class="space-y-4 grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <!-- Current Plan Status -->
      <Card v-if="me.subscription">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>{{ $t('billing.current_plan.title') }}</CardTitle>
            <Badge variant="default" class="bg-green-600">
              {{ $t('billing.current_plan.active') }}
            </Badge>
          </div>
          <CardDescription>
            {{ $t('billing.current_plan.description') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('billing.current_plan.plan') }}</span>
              <span class="font-medium">Pro Plan</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('billing.current_plan.price') }}</span>
              <span class="font-medium">€20/month</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('billing.current_plan.next_billing') }}</span>
              <span class="font-medium">{{ formatDate(me.subscription.periodEnd) }}</span>
            </div>
            <div v-if="me.subscription.cancelAtPeriodEnd" class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('billing.current_plan.status') }}</span>
              <Badge variant="destructive">
                {{ $t('billing.current_plan.canceling') }}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            :disabled="isOpeningPortal"
            class="w-full"
            @click="handleManageBilling"
          >
            <Loader2 v-if="isOpeningPortal" class="mr-2 h-4 w-4 animate-spin" />
            <CreditCard v-else class="mr-2 h-4 w-4" />
            {{ $t('billing.current_plan.manage') }}
          </Button>
        </CardFooter>
      </Card>

      <template v-else>
        <!-- Free Plan -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>{{ $t('billing.free_plan.title') }}</CardTitle>
              <Badge variant="secondary">
                {{ $t('billing.free_plan.current') }}
              </Badge>
            </div>
            <CardDescription>
              {{ $t('billing.free_plan.description') }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm">
                <Check class="h-4 w-4 text-green-600" />
                <span>{{ $t('billing.free_plan.features.basic') }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <Check class="h-4 w-4 text-green-600" />
                <span>{{ $t('billing.free_plan.features.limited') }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Pro Plan Card -->
        <Card class="border-primary relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 dark:border-primary/80 bg-linear-to-br from-primary/0 via-primary/10 to-primary/0 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 cursor-pointer">
          <CardHeader class="relative">
            <div class="flex items-center justify-between">
              <CardTitle>{{ $t('billing.pro_plan.title') }}</CardTitle>
              <Badge variant="default">
                {{ $t('billing.pro_plan.popular') }}
              </Badge>
            </div>
            <CardDescription>
              {{ $t('billing.pro_plan.description') }}
            </CardDescription>
          </CardHeader>
          <CardContent class="relative">
            <div class="space-y-4">
              <div class="text-3xl font-bold">
                €20<span class="text-base font-normal text-muted-foreground">/{{ $t('billing.pro_plan.per_month') }}</span>
              </div>
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-sm">
                  <Check class="h-4 w-4 text-green-600" />
                  <span>{{ $t('billing.pro_plan.features.unlimited') }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <Check class="h-4 w-4 text-green-600" />
                  <span>{{ $t('billing.pro_plan.features.priority') }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <Check class="h-4 w-4 text-green-600" />
                  <span>{{ $t('billing.pro_plan.features.advanced') }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <Check class="h-4 w-4 text-green-600" />
                  <span>{{ $t('billing.pro_plan.features.support') }}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter class="relative">
            <Button
              v-if="!me.subscription"
              :disabled="isCreatingCheckout"
              class="w-full"
              size="lg"
              @click="handleSubscribe"
            >
              <Loader2 v-if="isCreatingCheckout" class="mr-2 h-4 w-4 animate-spin" />
              {{ $t('billing.pro_plan.subscribe') }}
            </Button>
            <div v-else class="w-full text-center text-sm text-muted-foreground">
              {{ $t('billing.pro_plan.current_plan') }}
            </div>
          </CardFooter>
        </Card>
      </template>
    </div>
  </div>
</template>
