<script setup lang="ts">
import { ref } from "vue";
import type { Subject, RoomsEnroll } from "../types/examPlanner";
import PlacedChip from "./PlacedChip.vue";

const props = defineProps<{
  id: string;
  disabled?: boolean;
  assignedList?: Subject[];
  extrasForSubjects?: Record<string, RoomsEnroll>;
  pid: number;
  dateIso: string;
  slotIndex: number;
}>();

const emit = defineEmits<{
  (e: 'remove-one', subjectId: string): void;
  (e: 'drop-item', data: string): void;
}>();

const isOver = ref(false);

function onDragOver(e: DragEvent) {
  if (props.disabled) return;
  e.preventDefault();
  isOver.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
}

function onDragLeave(e: DragEvent) {
  isOver.value = false;
}

function onDrop(e: DragEvent) {
  if (props.disabled) return;
  e.preventDefault();
  isOver.value = false;
  if (e.dataTransfer) {
    const data = e.dataTransfer.getData("text/plain");
    if (data) {
      emit('drop-item', data);
    }
  }
}
</script>

<template>
  <td
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    class="align-top min-w-[170px] h-20 p-2 border transition-colors"
    :class="[
      disabled ? 'bg-gray-100 text-gray-400' : isOver ? 'ring-2 ring-indigo-400 bg-indigo-50' : 'bg-white'
    ]"
  >
    <div v-if="assignedList && assignedList.length" class="space-y-2">
      <div v-for="s in assignedList" :key="s.id" class="relative group">
        <!-- Capseta arrossegable entre cel·les, AMB aules/estudiants a dins -->
        <PlacedChip
          :pid="pid"
          :dateIso="dateIso"
          :slotIndex="slotIndex"
          :s="s"
          :extra="extrasForSubjects?.[s.id]"
        />

        <button
          v-if="!disabled"
          @click="emit('remove-one', s.id)"
          class="absolute -top-2 -right-2 w-6 h-6 rounded-full border bg-white shadow text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50 text-red-600"
          aria-label="Eliminar"
          title="Eliminar d’aquesta cel·la"
        >
          ×
        </button>
      </div>
    </div>
    <div v-else class="text-xs text-gray-400 italic">
      {{ disabled ? "No disponible" : "Arrossega aquí" }}
    </div>
  </td>
</template>
