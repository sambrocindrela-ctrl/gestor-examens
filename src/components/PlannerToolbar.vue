<script setup lang="ts">
import type { Subject, Period } from "../types/examPlanner";

const props = defineProps<{
  availableSubjects: Subject[];
  subjects: Subject[];

  lastDeleted: { subject: Subject } | null;
  periods: Period[];
  activePid: number;
}>();

const emit = defineEmits<{
  (e: 'undo-delete'): void;
  (e: 'set-last-deleted', val: any): void;
  (e: 'set-active-pid', id: number): void;
  (e: 'add-period'): void;
  (e: 'remove-period', pid: number): void;

  // Import/Export events
  (e: 'import-csv', event: Event): void;
  (e: 'merge-subjects-csv', event: Event): void;
  (e: 'import-rooms-csv', event: Event): void;
  (e: 'import-json', event: Event): void;
  
  (e: 'export-csv'): void;
  (e: 'export-txt'): void;
  (e: 'export-excel'): void;
  (e: 'export-word'): void;
  (e: 'export-json'): void;

  (e: 'save-state'): void;
  (e: 'load-state'): void;
  (e: 'copy-link'): void;
}>();

const totalSubjects = props.subjects.length;
const availableCount = props.availableSubjects.length;
const assignedCount = totalSubjects - availableCount;

function getTipusLabel(tipus: string) {
  return tipus === "FINAL" ? "FINAL" : tipus === "REAVALUACIÓ" ? "REAVALUACIÓ" : "PARCIAL";
}
</script>

<template>
  <div class="p-4 rounded-2xl border shadow-sm bg-white mb-6">
    <h2 class="font-semibold mb-3">Dades i intercanvi</h2>

    <!-- Botons d'import/export i enllaç -->
    <div class="flex flex-wrap gap-3 items-center">
      <label class="px-3 py-2 border rounded-xl shadow-sm cursor-pointer bg-white hover:bg-gray-50">
        Importar CSV (REEMPLAÇA)
        <input
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="(e) => emit('import-csv', e)"
        />
      </label>

      <label class="px-3 py-2 border rounded-xl shadow-sm cursor-pointer bg-white hover:bg-gray-50">
        Afegir assignatures (CSV) — MERGE
        <input
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="(e) => emit('merge-subjects-csv', e)"
        />
      </label>

      <label class="px-3 py-2 border rounded-xl shadow-sm cursor-pointer bg-white hover:bg-gray-50">
        Importar Aules/Matriculats (CSV)
        <input
          type="file"
          accept="application/json"
          class="hidden"
          @change="(e) => emit('import-json', e)"
        />
      </label>

      <button @click="emit('save-state')" class="px-3 py-2 border rounded-xl shadow-sm hover:bg-gray-50">
        Guardar estat a l'URL
      </button>
      <button @click="emit('load-state')" class="px-3 py-2 border rounded-xl shadow-sm hover:bg-gray-50">
        Carregar estat de l'URL
      </button>
      <button @click="emit('copy-link')" class="px-3 py-2 border rounded-xl shadow-sm hover:bg-gray-50">
        Copiar enllaç
      </button>
    </div>

    <p class="text-xs text-gray-600 mt-2">
      Assignatures disponibles a la safata:
      <strong>{{ availableCount }}</strong> (de {{ totalSubjects }}). Assignades al
      calendari (tots períodes): <strong>{{ assignedCount }}</strong>.
    </p>

    <p class="text-xs text-gray-500 mt-1">
      Si canvies molt el CSV, pot ser recomanable reiniciar-ho tot amb
      &nbsp;"Importar CSV (REEMPLAÇA)".
    </p>

    <!-- Banner Desfer eliminació -->
    <div v-if="lastDeleted" class="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded-xl text-xs flex items-center justify-between gap-2">
      <span>
        Assignatura eliminada del catàleg:
        <strong>
          {{ lastDeleted.subject.sigles || lastDeleted.subject.codi }}
        </strong>
      </span>
      <div class="flex gap-2">
        <button
          @click="emit('undo-delete')"
          class="px-2 py-1 text-xs border rounded-lg bg-white hover:bg-gray-50"
        >
          Desfer
        </button>
        <button
          @click="emit('set-last-deleted', null)"
          class="px-2 py-1 text-xs border rounded-lg bg-white hover:bg-gray-50"
        >
          Amaga
        </button>
      </div>
    </div>

    <!-- Pestanyes de períodes -->
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in periods"
          :key="p.id"
          @click="emit('set-active-pid', p.id)"
          class="px-4 py-2 rounded-full border text-sm font-medium transition-colors"
          :class="[
            p.id === activePid
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-white hover:bg-gray-50'
          ]"
        >
          {{ getTipusLabel(p.tipus) }}
        </button>

        <button
          @click="emit('add-period')"
          class="px-4 py-2 rounded-full border text-sm bg-green-50 hover:bg-green-100 transition-colors"
        >
          Afegir període
        </button>
      </div>

      <button
        v-if="periods.length > 1"
        @click="emit('remove-period', activePid)"
        class="px-4 py-2 rounded-full border text-sm bg-red-50 hover:bg-red-100 transition-colors"
      >
        Eliminar període actiu
      </button>
    </div>
  </div>
</template>