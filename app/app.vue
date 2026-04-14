<template>
  <NuxtLayout name="private">
    <ClientOnly>
      <AppLoading v-if="!isAuthenticated" />
      <NuxtPage v-else :transition="true" class="bg-gray-100 dark:bg-black" />
      <template #fallback>
        <AppLoading />
      </template>
    </ClientOnly>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { UserAuth } from '~/types/userAuth'

const userAuth = useState<UserAuth>('auth')
const isAuthenticated = computed(() => userAuth.value?.isAuthenticated ?? false)
</script>
