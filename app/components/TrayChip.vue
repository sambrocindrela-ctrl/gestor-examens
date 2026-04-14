<script setup lang="ts">
import type { Subject } from "../types/examPlanner";
import SubjectChip from "./SubjectChip.vue";

defineProps<{
  s: Subject;
}>();
</script>

<template>
  <SubjectChip variant="tray" :s="s" />
</template>