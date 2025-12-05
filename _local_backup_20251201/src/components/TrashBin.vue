<script setup lang="ts">
import { ref } from "vue";

const isOver = ref(false);
const emit = defineEmits<{
  (e: 'drop-trash', data: string): void
}>();

function onDragOver(e: DragEvent) {
  e.preventDefault(); // Necessary to allow dropping
  isOver.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
}

function onDragLeave(e: DragEvent) {
  isOver.value = false;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isOver.value = false;
  if (e.dataTransfer) {
    const data = e.dataTransfer.getData("text/plain");
    if (data) {
      emit('drop-trash', data);
    }
  }
}
</script>

<template>
  <div
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    class="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-md bg-white transition-colors"
    :class="{ 'ring-2 ring-red-400 bg-red-50': isOver }"
  >
    <span class="text-sm">🗑️ Paperera</span>
    <span class="text-xs text-gray-500">
      Arrossega aquí per eliminar del catàleg
    </span>
  </div>
</template>
