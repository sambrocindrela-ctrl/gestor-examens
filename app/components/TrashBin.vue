<script setup lang="ts">
import { ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { Subject } from '../types/examPlanner';

// We use a dummy list to act as a drop target
const trashList = ref<Subject[]>([]);

const emit = defineEmits<{
  (e: 'delete', item: any): void
}>();

function onAdd() {
  // When something is dropped here, we emit the delete event
  // The item is added to trashList by v-model, so we can take it from there
  const item = trashList.value[0];
  if (item && item.id) {
    emit('delete', item.id);
  }
  // Clear the list immediately so it doesn't actually "store" items
  trashList.value = [];
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50">
    <ClientOnly>
      <VueDraggable v-model="trashList" group="subjects" @add="onAdd"
        class="rounded-full shadow-4 hover:shadow-6 transition-all duration-300"
        ghost-class="hidden">
        
        <q-card class="bg-red-1 dark:bg-red-10 border border-red-3 dark:border-red-9 rounded-borders" flat style="border-radius: 9999px;">
          <div class="q-px-lg q-py-sm flex items-center q-gutter-x-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
            <q-icon name="delete_outline" size="sm" color="negative" />
            <div class="column">
              <span class="text-subtitle2 text-weight-bold text-negative leading-none">Paperera</span>
              <span class="text-caption text-negative opacity-70 leading-none">Arrossega aquí</span>
            </div>
          </div>
        </q-card>

      </VueDraggable>
    </ClientOnly>
  </div>
</template>

<style scoped>
/* Optional: Add styling for when dragging over */
.sortable-drag {
  opacity: 0;
}
</style>