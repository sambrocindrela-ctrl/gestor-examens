<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black">
    <div class="relative w-24 h-24 mb-6">
      <!-- Outer ring -->
      <div class="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
      <!-- Spinning primary ring -->
      <div class="absolute inset-0 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      <!-- Inner dot -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
      </div>
    </div>
    <div class="text-xl font-medium text-gray-800 dark:text-gray-100 animate-pulse tracking-wide">
      Preparant calendari d'exàmens...
    </div>
    <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
      Autenticant amb Keycloak
    </div>
  </div>
</template>

<script setup lang="ts">
// Simple loading component for Keycloak initialization
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
