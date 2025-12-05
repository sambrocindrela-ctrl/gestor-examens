<script setup lang="ts">
import type { Subject } from "../types/examPlanner";

defineProps<{
  s: Subject;
}>();
</script>

<template>
  <div v-if="s.MET || s.MATT || s.MEE || s.MCYBERS" class="mt-1 text-[10px] leading-tight space-y-0.5">
    <!-- MET neutre -->
    <div v-if="s.MET" class="text-gray-600">
      <span>{{ s.MET }}</span>
    </div>

    <!-- MATT en blau -->
    <div v-if="s.MATT" class="text-blue-700">
      <span>{{ s.MATT }}</span>
    </div>

    <!-- MEE en vermell -->
    <div v-if="s.MEE" class="text-red-700">
      <span>{{ s.MEE }}</span>
    </div>

    <!-- MCYBERS en verd -->
    <div v-if="s.MCYBERS" class="text-green-700">
      <span>{{ s.MCYBERS }}</span>
    </div>
  </div>
</template>
