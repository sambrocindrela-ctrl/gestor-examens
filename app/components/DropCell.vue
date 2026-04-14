<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Subject, RoomsEnroll } from "../types/examPlanner";
import PlacedChip from "./PlacedChip.vue";
import { useDarkColors } from "../composables/useDarkColors";

const props = defineProps<{
  id: string; // cellKey
  disabled?: boolean;
  assignedList?: Subject[];
  extrasForSubjects?: Record<string, RoomsEnroll>;
  pid: number;
  dateIso: string;
  slotIndex: number;
}>();

const emit = defineEmits<{
  (e: 'remove-one', subjectId: string): void;
  (e: 'update-list', newList: Subject[]): void;
}>();

// Writable computed for v-model
const list = computed({
  get: () => props.assignedList || [],
  set: (val) => { emit('update-list', val); }
});

const { dark, cellBorderClass, subtleTextClass } = useDarkColors();

const cellClass = computed(() => [
  'align-top min-w-[170px] border transition-colors',
  cellBorderClass.value,
  props.disabled
    ? (dark.value ? 'bg-grey-10 text-grey-8' : 'bg-grey-2 text-grey-6')
    : (dark.value ? 'bg-grey-9' : 'bg-white')
]);

function onRemove(subjectId: string) {
  emit('remove-one', subjectId);
}
</script>

<template>
  <td :class="cellClass">
    <ClientOnly>
      <VueDraggable
        v-model="list"
        group="subjects"
        class="space-y-2 min-h-[80px] h-full w-full p-2"
        :disabled="disabled"
        ghost-class="opacity-50"
      >
        <div v-for="s in list" :key="s.id" class="relative group">
          <PlacedChip :s="s" :extra="extrasForSubjects?.[s.id]" />
          <q-btn
            v-if="!disabled"
            @click.stop="onRemove(s.id)"
            class="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            dense size="xs" color="negative" icon="close"
            aria-label="Eliminar"
            title="Eliminar d'aquesta cel\u00b7la"
          />
        </div>

        <p v-if="!list.length" :class="subtleTextClass" class="text-xs italic pointer-events-none q-ma-none">
          {{ disabled ? 'No disponible' : 'Arrossega aquí' }}
        </p>
      </VueDraggable>
    </ClientOnly>
  </td>
</template>