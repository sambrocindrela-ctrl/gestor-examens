<script setup lang="ts">
import { computed } from "vue";
import {
  addDays,
  subDays,
  startOfDay,
  isAfter,
  isBefore,
  parseISO,
  format,
} from "date-fns";
import type {
  Period,
  SlotsPerPeriod,
  AssignedPerPeriod,
  Subject,
  RoomsDataPerPeriod,
  RoomsEnroll,
} from "../types/examPlanner";
import DropCell from "./DropCell.vue";

const props = defineProps<{
  activePeriod: Period;
  activePid: number;
  slotsPerPeriod: SlotsPerPeriod;
  assignedPerPeriod: AssignedPerPeriod;
  subjects: Subject[];
  roomsData: RoomsDataPerPeriod;
}>();

const emit = defineEmits<{
  (e: 'remove-one-from-cell', pid: number, dateIso: string, slotIndex: number, subjectId: string): void;
  (e: 'drop-on-cell', pid: number, dateIso: string, slotIndex: number, data: string): void;
}>();

function mondayOfWeek(d: Date) {
  const day = d.getDay(); // 0=dg … 6=ds
  const diff = (day + 6) % 7; // 0 si dilluns
  return startOfDay(subDays(d, diff));
}

function fridayOfWeek(d: Date) {
  const mon = mondayOfWeek(d);
  return startOfDay(addDays(mon, 4));
}

function* eachWeekGenerator(mondayStart: Date, fridayEnd: Date) {
  let cur = new Date(mondayStart);
  while (!isAfter(cur, fridayEnd)) {
    const mon = new Date(cur);
    const fri = addDays(mon, 4);
    yield { mon, fri };
    cur = addDays(mon, 7);
  }
}

function fmtDM(d: Date) {
  return format(d, "dd/MM");
}

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function isDisabledDay(d: Date, p: Period) {
  const sd = parseISO(p.startStr);
  const ed = parseISO(p.endStr);
  const outside = isBefore(d, sd) || isAfter(d, ed);
  if (outside) return true;
  const bl = p.blackouts ?? [];
  return bl.includes(iso(d));
}

function cellKey(dateIso: string, slotIndex: number) {
  return `${dateIso}|${slotIndex}`;
}

const weeks = computed(() => {
  return [...eachWeekGenerator(
    mondayOfWeek(parseISO(props.activePeriod.startStr)),
    fridayOfWeek(parseISO(props.activePeriod.endStr))
  )];
});

const currentSlots = computed(() => props.slotsPerPeriod[props.activePid] ?? []);

const dayLabels = ["Dl/Mon", "Dt/Tu", "Dc/Wed", "Dj/Thu", "Dv/Fri"];
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center gap-3 mb-2">
      <h3 class="text-lg font-semibold">
        {{ activePeriod.tipus }} —
        {{ format(parseISO(activePeriod.startStr), "dd/MM") }} a
        {{ format(parseISO(activePeriod.endStr), "dd/MM") }}
      </h3>
      <span class="text-sm text-gray-500">(dl–dv)</span>
    </div>

    <div v-for="(week, wIdx) in weeks" :key="wIdx" class="mt-6">
      <div class="flex items-center gap-3 mb-2">
        <h4 class="font-semibold">
          Setmana {{ format(week.mon, "dd/MM") }} — {{ format(week.fri, "dd/MM") }}
        </h4>
        <span class="text-xs text-gray-500">(dl–dv)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th class="border p-2 w-28 text-left">Franja</th>
              <th v-for="i in 5" :key="i" class="border p-2 min-w-[170px] text-left">
                <div class="font-semibold">
                  {{ dayLabels[i - 1] }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ fmtDM(addDays(week.mon, i - 1)) }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, slotIndex) in currentSlots" :key="slotIndex">
              <td class="border p-2 align-top font-medium whitespace-nowrap">
                {{ s.start }}-{{ s.end }}
              </td>
              <template v-for="i in 5" :key="i">
                <DropCell
                  :pid="activePid"
                  :dateIso="iso(addDays(week.mon, i - 1))"
                  :slotIndex="slotIndex"
                  :id="`cell:${activePid}:${iso(addDays(week.mon, i - 1))}:${slotIndex}`"
                  :disabled="isDisabledDay(addDays(week.mon, i - 1), activePeriod)"
                  :assignedList="(assignedPerPeriod[activePid]?.[cellKey(iso(addDays(week.mon, i - 1)), slotIndex)] ?? [])
                    .map(id => subjects.find(x => x.id === id))
                    .filter(Boolean) as Subject[]"
                  :extrasForSubjects="(() => {
                    const subjIds = assignedPerPeriod[activePid]?.[cellKey(iso(addDays(week.mon, i - 1)), slotIndex)] ?? [];
                    const extrasCell = roomsData?.[activePid]?.[cellKey(iso(addDays(week.mon, i - 1)), slotIndex)] ?? {};
                    const res: Record<string, RoomsEnroll> = {};
                    for (const sid of subjIds) {
                      if (extrasCell[sid]) res[sid] = extrasCell[sid];
                    }
                    return res;
                  })()"
                  @remove-one="(sid) => emit('remove-one-from-cell', activePid, iso(addDays(week.mon, i - 1)), slotIndex, sid)"
                  @drop-item="(data) => emit('drop-on-cell', activePid, iso(addDays(week.mon, i - 1)), slotIndex, data)"
                />
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
