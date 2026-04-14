<script setup lang="ts">
/**
 * SubjectChip — base shared chip for both tray (clone mode) and calendar grid (placed mode).
 * - `variant="tray"`  → compact, inline-flex, no extras
 * - `variant="placed"` → full-width, shows room/students extras
 */
import type { Subject, RoomsEnroll } from "../types/examPlanner";
import MastersLines from "./MastersLines.vue";

const props = defineProps<{
  s: Subject;
  variant?: 'tray' | 'placed';
  extra?: RoomsEnroll;
}>();

const isPlaced = props.variant === 'placed';
const hasRooms = isPlaced && props.extra?.rooms && props.extra.rooms.length > 0;
const hasStud = isPlaced && props.extra && typeof props.extra.students === "number" && !Number.isNaN(props.extra.students);
</script>

<template>
  <div
    :class="[
      'relative border rounded-lg shadow-1 hover:shadow-4 transition-all duration-200',
      'bg-white dark:bg-grey-10 text-dark dark:text-grey-3',
      'border-grey-3 dark:border-grey-9 hover:border-primary',
      isPlaced
        ? 'p-3 cursor-grab active:cursor-grabbing'
        : 'inline-flex flex-col px-3 py-2 select-none cursor-grab active:cursor-grabbing'
    ]"
    :title="isPlaced ? 'Arrossega per moure a una altra franja' : `${s.sigles} · ${s.codi}`"
  >
    <!-- Header: Code + Sigles -->
    <div :class="['font-bold leading-tight q-mb-xs text-primary', isPlaced ? 'text-sm' : 'text-xs truncate']">
      {{ s.sigles }} · {{ s.codi }}
    </div>

    <!-- Nivell or Master lines -->
    <div :class="isPlaced ? 'text-xs text-grey-7 dark:text-grey-5' : 'text-xs text-grey-7 dark:text-grey-5 leading-4'">
      <template v-if="s.nivell">Nivell: {{ s.nivell }}</template>
      <MastersLines v-else :s="s" />
    </div>

    <!-- Placed-only: Rooms and students extras -->
    <div v-if="isPlaced && (hasRooms || hasStud)"
      class="q-mt-sm q-pt-xs border-t border-dashed border-grey-3 dark:border-grey-9 space-y-1 text-xs">
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
