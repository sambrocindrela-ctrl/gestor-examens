<script setup lang="ts">
import type { Subject, RoomsEnroll } from "../types/examPlanner";
import SubjectChip from "./SubjectChip.vue";

defineProps<{
  s: Subject;
  extra?: RoomsEnroll;
}>();
</script>

<template>
  <SubjectChip variant="placed" :s="s" :extra="extra" />
</template>