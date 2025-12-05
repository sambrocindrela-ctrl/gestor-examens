<script setup lang="ts">
import type { Subject } from "../types/examPlanner";
import TrayChip from "./TrayChip.vue";

defineProps<{
  availableSubjects: Subject[];
  subjects: Subject[];
  hiddenSubjectIds: string[];
}>();

const emit = defineEmits<{
  (e: 'restore-hidden', id: string): void;
  (e: 'restore-all-hidden'): void;
}>();
</script>

<template>
  <!-- Safata d'assignatures -->
  <div class="p-4 rounded-2xl border shadow-sm bg-white mb-3">
    <h2 class="font-semibold mb-3">Assignatures (arrossega)</h2>

    <div class="flex flex-wrap gap-2">
      <TrayChip v-for="s in availableSubjects" :key="s.id" :id="s.id" :s="s" />

      <div v-if="!availableSubjects.length" class="text-xs text-gray-500 italic">
        No hi ha assignatures per al curs/quadrimestre i període
        d’aquest calendari, o ja estan totes
        programades/ocultes.
      </div>
    </div>
  </div>

  <!-- Llista d'eliminades (amb restauració) -->
  <div v-if="hiddenSubjectIds.length > 0" class="p-3 rounded-xl border shadow-sm bg-yellow-50 mb-6 text-sm">
    <div class="font-semibold mb-2">
      Assignatures eliminades de la safata
    </div>
    <div class="flex flex-wrap gap-2">
      <span
        v-for="id in hiddenSubjectIds"
        :key="id"
        class="inline-flex items-center gap-2 px-2 py-1 rounded-lg border bg-white"
      >
        <template v-if="subjects.find(x => x.id === id)">
          {{ subjects.find(x => x.id === id)?.sigles || subjects.find(x => x.id === id)?.codi }}
          <button
            class="text-xs px-2 py-0.5 border rounded-md hover:bg-gray-50"
            @click="emit('restore-hidden', id)"
            title="Restaurar a la safata"
          >
            Restaurar
          </button>
        </template>
      </span>
      <button
        class="ml-2 text-xs px-2 py-0.5 border rounded-md bg-white hover:bg-gray-50"
        @click="emit('restore-all-hidden')"
        title="Restaurar totes"
      >
        Restaurar totes
      </button>
    </div>
  </div>
</template>
