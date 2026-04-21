<script setup lang="ts">
import { ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Subject } from '../types/examPlanner';

// We use a dummy list to act as a drop target
const clipboardList = ref<Subject[]>([]);

const emit = defineEmits<{
  (e: 'move-to-clipboard', item: string): void
}>();

function onAdd() {
  // When something is dropped here, we emit the move-to-clipboard event
  const item = clipboardList.value[0];
  if (item && item.id) {
    emit('move-to-clipboard', item.id);
  }
  // Clear the list immediately
  clipboardList.value = [];
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50">
    <ClientOnly>
      <VueDraggable v-model="clipboardList" group="subjects" @add="onAdd"
        class="rounded-full shadow-4 hover:shadow-6 transition-all duration-300"
        ghost-class="hidden">
        
        <q-card class="bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-borders" flat style="border-radius: 9999px;">
          <div class="q-px-lg q-py-sm flex items-center q-gutter-x-sm cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
            <q-icon name="content_paste" size="sm" color="teal" />
            <div class="column">
              <span class="text-subtitle2 text-weight-bold text-teal-9 leading-none dark:text-teal-2">Clipboard</span>
              <span class="text-caption text-teal-7 opacity-70 leading-none dark:text-teal-4">Quitar de l'horari</span>
            </div>
          </div>
        </q-card>

      </VueDraggable>
    </ClientOnly>
  </div>
</template>

<style scoped>
.sortable-drag {
  opacity: 0;
}
</style>