<template>
  <QLayout view="hHh Lpr lff" class="h-screen overflow-hidden">
    <AppDefaultHeader />
    <QPageContainer class="h-full overflow-hidden bg-gray-light dark:bg-black">
      <slot />
    </QPageContainer>
  </QLayout>
</template>

<script setup lang="ts">
</script>
