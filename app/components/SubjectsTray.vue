<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Subject } from "../types/examPlanner";
import TrayChip from "./TrayChip.vue";
import { useDarkColors } from "../composables/useDarkColors";

const props = defineProps<{
  availableSubjects: Subject[];
  subjects: Subject[];
  hiddenSubjectIds: string[];
}>();

const emit = defineEmits<{
  (e: 'update:hiddenSubjectIds', val: string[]): void
}>();

const { dark, mutedTextClass, subtleTextClass } = useDarkColors();

// Pre-computed map for O(1) subject lookup instead of repeated .find() in template
const subjectsMap = computed(() =>
  new Map(props.subjects.map(s => [s.id, s]))
);

function subjectLabel(id: string) {
  const s = subjectsMap.value.get(id);
  return s?.sigles || s?.codi || id;
}

// We need a writable computed for v-model
const list = computed({
  get: () => props.availableSubjects,
  set: () => { /* No-op for tray reordering */ }
});

function restore(id: string) {
  emit('update:hiddenSubjectIds', props.hiddenSubjectIds.filter(x => x !== id));
}

function restoreAll() {
  emit('update:hiddenSubjectIds', []);
}

function clone(element: Subject) {
  return element;
}
</script>

<template>
  <!-- Subjects tray card -->
  <q-card flat bordered class="q-pa-md q-mb-md">
    <q-card-section>
      <h6 :class="mutedTextClass" class="text-h6 text-weight-bold q-mt-none q-mb-md">Assignatures (arrossega)</h6>

      <ClientOnly>
        <VueDraggable
          v-model="list"
          :group="{ name: 'subjects', pull: 'clone', put: false }"
          :clone="clone"
          :sort="false"
          class="flex flex-wrap gap-2"
          style="min-height: 50px;"
        >
          <TrayChip v-for="s in list" :key="s.id" :s="s" />
        </VueDraggable>
      </ClientOnly>

      <!-- Empty state -->
      <div v-if="!availableSubjects.length" class="flex flex-col items-center justify-center q-py-xl opacity-70">
        <q-icon name="all_inbox" size="4rem" :color="dark ? 'grey-6' : 'grey-5'" class="q-mb-md" />
        <p :class="mutedTextClass" class="text-subtitle1 text-weight-medium text-center q-mb-xs">
          Totes les assignatures programades
        </p>
        <p :class="subtleTextClass" class="text-caption text-center q-ma-none" style="max-width: 250px;">
          No hi ha més assignatures pel període actiu o bé estan totes ocultes.
        </p>
      </div>
    </q-card-section>
  </q-card>

  <!-- Hidden subjects banner -->
  <q-banner v-if="hiddenSubjectIds.length > 0" inline-actions class="bg-warning text-dark q-mb-md rounded-borders">
    <p class="text-weight-bold q-mb-sm">Assignatures ocultes de la safata</p>
    <div class="flex flex-wrap gap-sm items-center">
      <q-chip
        v-for="id in hiddenSubjectIds" :key="id"
        removable @remove="restore(id)"
        color="white" text-color="dark"
        icon="visibility_off"
      >
        {{ subjectLabel(id) }}
      </q-chip>
      <q-btn size="sm" outline color="dark" class="q-ml-sm" @click="restoreAll" label="Restaurar totes" />
    </div>
  </q-banner>
</template>