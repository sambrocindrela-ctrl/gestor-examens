<template>
  <QLayout view="hHh Lpr lff">
    <AppDefaultHeader />
    <QPageContainer class="min-h-screen bg-gray-light dark:bg-black">
      <slot />
    </QPageContainer>
  </QLayout>
</template>

<script setup lang="ts">
</script>
