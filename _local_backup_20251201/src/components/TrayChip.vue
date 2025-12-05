<script setup lang="ts">
import type { Subject } from "../types/examPlanner";
import MastersLines from "./MastersLines.vue";

const props = defineProps<{
  id: string;
  s: Subject;
}>();

function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", props.id);
    // Optional: set drag image
  }
}
</script>

<template>
  <div
    draggable="true"
    @dragstart="onDragStart"
    class="relative inline-flex flex-col px-3 py-2 rounded-2xl shadow-sm border text-sm select-none bg-white cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    :title="`${s.sigles} · ${s.codi}`"
    style="max-width: 300px"
  >
    <span class="font-medium truncate">
      {{ s.sigles }} · {{ s.codi }}
    </span>
    <span v-if="s.nivell" class="text-xs opacity-80 leading-4">
      Nivell: {{ s.nivell }}
    </span>
    <MastersLines v-else :s="s" />
  </div>
</template>
