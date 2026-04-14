<script setup lang="ts">
import type { Subject, RoomsEnroll } from "../types/examPlanner";
import MastersLines from "./MastersLines.vue";

const props = defineProps<{
  s: Subject;
  extra?: RoomsEnroll;
}>();

const hasRooms = props.extra?.rooms && props.extra.rooms.length > 0;
const hasStud =
  props.extra &&
  typeof props.extra.students === "number" &&
  !Number.isNaN(props.extra.students);
</script>

<template>
  <div
    class="relative p-3 rounded-lg border bg-white dark:bg-grey-10 text-dark dark:text-grey-3 shadow-1 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-4 border-grey-3 dark:border-grey-9 hover:border-primary"
    title="Arrossega per moure a una altra franja"
  >
    <div class="text-sm font-bold leading-tight q-mb-xs text-primary">
      {{ s.sigles }} · {{ s.codi }}
    </div>

    <div v-if="s.nivell" class="text-xs text-grey-7 dark:text-grey-5">
      Nivell: {{ s.nivell }}
    </div>
    <MastersLines v-else :s="s" />

    <div v-if="hasRooms || hasStud" class="q-mt-sm q-pt-xs border-t border-dashed border-grey-3 dark:border-grey-9 space-y-1 text-xs">
      <div v-if="hasRooms" class="flex items-start q-gutter-x-xs no-wrap">
        <q-icon name="room" size="14px" color="primary" class="q-mt-xs" />
        <div class="flex-1">
          <span class="text-weight-bold opacity-70">Aules:</span>
          {{ extra!.rooms.join(", ") }}
        </div>
      </div>
      <div v-if="hasStud" class="flex items-start q-gutter-x-xs no-wrap">
        <q-icon name="groups" size="14px" color="primary" class="q-mt-xs" />
        <div class="flex-1">
          <span class="text-weight-bold opacity-70">Matrícula:</span>
          {{ extra!.students }}
        </div>
      </div>
    </div>
  </div>
</template>