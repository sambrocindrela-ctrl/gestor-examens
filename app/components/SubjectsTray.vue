<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Subject } from "../types/examPlanner";
import TrayChip from "./TrayChip.vue";

const props = defineProps<{
  availableSubjects: Subject[];
  subjects: Subject[];
  hiddenSubjectIds: string[];
}>();

const emit = defineEmits<{
  (e: 'update:hiddenSubjectIds', val: string[]): void
}>();

// We need a writable computed for v-model, but since we don't want to modify availableSubjects directly
// (it's a filtered view), we use a getter. The setter is needed for the library but won't be used for reordering here.
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

// Clone function for VueDraggable
function clone(element: Subject) {
  return element;
}
</script>

<template>
  <!-- Safata d'assignatures -->
  <q-card flat bordered class="q-pa-md q-mb-md">
    <q-card-section>
      <div class="text-h6 text-weight-bold q-mb-md">Assignatures (arrossega)</div>

      <ClientOnly>
        <VueDraggable v-model="list" :group="{ name: 'subjects', pull: 'clone', put: false }" :clone="clone"
          :sort="false" class="flex flex-wrap gap-2" style="min-height: 50px;">
          <TrayChip v-for="s in list" :key="s.id" :s="s" />
        </VueDraggable>
      </ClientOnly>

      <div v-if="!availableSubjects.length" class="flex flex-col items-center justify-center q-py-xl opacity-70">
        <q-icon name="all_inbox" size="4rem" :color="$q.dark.isActive ? 'grey-6' : 'grey-5'" class="q-mb-md" />
        <div class="text-subtitle1 text-weight-medium text-center" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'">
          Totes les assignatures programades
        </div>
        <div class="text-caption text-center mt-1" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'" style="max-width: 250px;">
          No hi ha més assignatures pel període actiu o bé estan totes ocultes.
        </div>
      </div>
    </q-card-section>
  </q-card>

  <!-- Llista d'eliminades (amb restauració) -->
  <q-banner v-if="hiddenSubjectIds.length > 0" inline-actions class="bg-warning text-dark q-mb-md rounded-borders">
    <div class="text-weight-bold q-mb-sm">
      Assignatures ocultes de la safata
    </div>
    <div class="flex flex-wrap gap-sm items-center">
      <q-chip v-for="id in hiddenSubjectIds" :key="id" removable @remove="restore(id)" color="white" text-color="dark"
        icon="visibility_off">
        <template v-if="subjects.find(x => x.id === id)">
          {{subjects.find(x => x.id === id)?.sigles || subjects.find(x => x.id === id)?.codi}}
        </template>
      </q-chip>
      <q-btn size="sm" outline color="dark" class="q-ml-sm" @click="restoreAll" label="Restaurar totes" />
    </div>
  </q-banner>
</template>