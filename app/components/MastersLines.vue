<script setup lang="ts">
import type { Subject } from "../types/examPlanner";

defineProps<{
  s: Subject;
}>();
</script>

<template>
  <div class="flex flex-col text-xs opacity-90 leading-3 mt-0.5">
    <span v-if="s.MET" class="text-grey-7 dark:text-grey-4">MET: {{ s.MET }}</span>
    <span v-if="s.MATT" class="text-blue-700 dark:text-blue-300 font-medium">MATT: {{ s.MATT }}</span>
    <span v-if="s.MEE" class="text-red-700 dark:text-red-300 font-medium">MEE: {{ s.MEE }}</span>
    <span v-if="s.MCYBERS" class="text-green-700 dark:text-green-300 font-medium">MCY: {{ s.MCYBERS }}</span>
  </div>
</template>