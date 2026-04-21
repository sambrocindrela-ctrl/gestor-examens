<script setup lang="ts">
import { computed } from 'vue';
import type { Subject } from "../types/examPlanner";
import TraySection from "./TraySection.vue";
import { useDarkColors } from "../composables/useDarkColors";

const props = defineProps<{
  queueSubjects: Subject[];
  noExamSubjects: Subject[];
  clipboardSubjects: Subject[];
  subjects: Subject[];
  hiddenSubjectIds: string[];
}>();

const emit = defineEmits<{
  (e: 'update:hiddenSubjectIds', val: string[]): void;
  (e: 'move-to-queue', id: string): void;
  (e: 'move-to-no-exam', id: string): void;
  (e: 'move-to-clipboard', id: string): void;
}>();

const { primaryTextClass, secondaryTextClass } = useDarkColors();

// Pre-computed map for O(1) subject lookup
const subjectsMap = computed(() =>
  new Map(props.subjects.map(s => [s.id, s]))
);

function subjectLabel(id: string) {
  const s = subjectsMap.value.get(id);
  return s?.sigles || s?.codi || id;
}

function restore(id: string) {
  emit('update:hiddenSubjectIds', props.hiddenSubjectIds.filter(x => x !== id));
}

function restoreAll() {
  emit('update:hiddenSubjectIds', []);
}
</script>

<template>
  <div class="column q-gutter-y-md">

    <!-- 1. PENDING QUEUE -->
    <TraySection title="Pendents de decidir" subtitle="Assignatures per ubicar o decidir què fer." icon="list_alt"
      icon-color="primary" :subjects="queueSubjects" empty-text="Cua buida" :title-class="primaryTextClass"
      @add="(id) => emit('move-to-queue', id)" />

    <!-- 2. NO EXAM -->
    <TraySection title="Sense Examen" subtitle="Assignatures que no requereixen horari d'examen." icon="cancel"
      icon-color="grey-7" :subjects="noExamSubjects" empty-text="Arrossega aquí si no té examen"
      bg-class="tray-section--grey" @add="(id) => emit('move-to-no-exam', id)" />

    <!-- 3. CLIPBOARD / MOVE STAGING -->
    <TraySection title="Reserva temporal" subtitle="Per moure dins el calendari o guardar temporalment."
      icon="content_paste" icon-color="teal" :subjects="clipboardSubjects" empty-text="Porta-retalls buit"
      bg-class="tray-section--teal" :title-class="secondaryTextClass" @add="(id) => emit('move-to-clipboard', id)" />

    <!-- Hidden subjects banner -->
    <q-banner v-if="hiddenSubjectIds.length > 0" inline-actions
      class="bg-amber-1 text-dark q-mb-md rounded-borders border border-amber-3">
      <p class="text-weight-bold q-mb-sm text-caption">Assignatures ocultes</p>
      <div class="flex flex-wrap gap-sm items-center">
        <q-chip v-for="id in hiddenSubjectIds" :key="id" removable @remove="restore(id)" color="white" text-color="dark"
          icon="visibility_off" dense class="text-caption">
          {{ subjectLabel(id) }}
        </q-chip>
        <q-btn size="xs" flat color="primary" @click="restoreAll" label="Restaurar totes" />
      </div>
    </q-banner>
  </div>
</template>