<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Subject } from "../types/examPlanner";
import TrayChip from "./TrayChip.vue";
import { useDarkColors } from "../composables/useDarkColors";

const props = defineProps<{
  title: string;
  subtitle: string;
  icon: string;
  iconColor?: string;
  subjects: Subject[];
  emptyText: string;
  group?: string;
  bgClass?: string;
  titleClass?: string;
}>();

const emit = defineEmits<{
  (e: 'add', id: string): void;
}>();

const { dark, cardBgClass, mutedTextClass, subtleTextClass } = useDarkColors();

// Writable computed for VueDraggable v-model (no-op as we use @add)
const list = computed({
  get: () => props.subjects,
  set: () => { /* No-op, handled by onAdd */ }
});

function onAdd(ev: any) {
  const id = ev.data?.id || (ev.item && ev.item._underlying_vm_ && ev.item._underlying_vm_.id);
  if (id) emit('add', id);
}

function clone(element: Subject) {
  return element;
}
</script>

<template>
  <q-card flat bordered class="tray-section shadow-sm" :class="[bgClass, cardBgClass]">
    <q-card-section class="q-pb-none">
      <div class="flex items-center q-gutter-x-sm q-mb-sm">
        <q-icon :name="icon" :color="iconColor || 'primary'" size="xs" />
        <h6 :class="[titleClass || mutedTextClass]" class="text-subtitle2 text-weight-bold q-my-none">
          {{ title }}
        </h6>
        <q-badge :color="iconColor || 'primary'" rounded :label="subjects.length" v-if="subjects.length" />
      </div>
      <p :class="subtleTextClass" class="text-caption q-mb-md">{{ subtitle }}</p>
    </q-card-section>

    <q-card-section>
      <ClientOnly>
        <VueDraggable
          v-model="list"
          :group="group || 'subjects'"
          :clone="clone"
          :sort="false"
          @add="onAdd"
          class="flex flex-wrap gap-2 tray-dropzone"
          :class="{ 'empty-zone': !subjects.length }"
        >
          <TrayChip v-for="s in subjects" :key="s.id" :s="s" />
          <div v-if="!subjects.length" class="full-width text-center q-py-sm opacity-50 text-caption italic">
            {{ emptyText }}
          </div>
        </VueDraggable>
      </ClientOnly>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.tray-section {
  transition: all 0.3s ease;
  border-radius: 12px;
}

.tray-dropzone {
  min-height: 48px;
  border: 2px dashed transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.empty-zone {
  background: rgba(0,0,0,0.02);
  border-color: rgba(0,0,0,0.05);
}

.dark .empty-zone {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.05);
}

.tray-dropzone:hover {
  border-color: var(--q-primary);
  background: rgba(var(--q-primary), 0.05);
}

/* Explicit backgrounds for specific tray sections */
.tray-section--grey {
  background-color: #fafafa !important;
}
.body--dark .tray-section--grey {
  background-color: #1a1a1a !important;
}

.tray-section--teal {
  background-color: #f0fdfa !important;
}
.body--dark .tray-section--teal {
  background-color: #0d1a18 !important;
}
</style>
