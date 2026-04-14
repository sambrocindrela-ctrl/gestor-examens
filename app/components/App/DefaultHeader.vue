<template>
  <QHeader class="q-pa-sm" :class="dark.isActive ? 'bg-dark' : 'bg-white text-primary'">
    <QToolbar>
      <img src="~/assets/images/upc_logo.webp" alt="Logo UPC" width="50" />
      <img src="~/assets/images/logo_telecos.webp" alt="Logo Telecos" width="90" />

      <QToolbarTitle>
        <div>{{ projectName }}</div>
        <div class="text-caption text-grey-6">{{ projectDescription }}</div>
      </QToolbarTitle>
      <q-toggle :model-value="dark.isActive" checked-icon="dark_mode" unchecked-icon="light_mode" size="3rem"
        @update:model-value="(val: boolean) => dark.set(val)" />
    </QToolbar>
  </QHeader>
</template>
<script lang="ts" setup>
const { dark } = useQuasar()
dark.set('auto')
const configRT = useRuntimeConfig()
const projectName = configRT.public.projectName
const projectDescription = configRT.public.projectDescription
</script>
