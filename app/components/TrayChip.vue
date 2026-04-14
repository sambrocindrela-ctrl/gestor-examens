<script setup lang="ts">
import type { Subject } from "../types/examPlanner";
import MastersLines from "./MastersLines.vue";

defineProps<{
  s: Subject;
}>();
</script>

<template>
  <div
    class="relative inline-flex flex-col px-3 py-2 rounded-lg shadow-1 border text-sm select-none bg-white dark:bg-grey-10 text-dark dark:text-grey-3 cursor-grab active:cursor-grabbing hover:shadow-4 border-grey-3 dark:border-grey-9 hover:border-primary transition-all duration-200"
    :title="`${s.sigles} · ${s.codi}`"
  >
    <div class="text-xs font-bold truncate text-primary q-mb-xs">
      {{ s.sigles }} · {{ s.codi }}
    </div>
    <div v-if="s.nivell" class="text-xs text-grey-7 dark:text-grey-5 leading-4">
      Nivell: {{ s.nivell }}
    </div>
    <MastersLines v-else :s="s" />
  </div>
</template>