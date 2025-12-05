<script setup lang="ts">
import { computed, triggerRef, ref } from "vue";
import Papa from "papaparse";
import {
  addDays,
  subDays,
  startOfDay,
  parseISO,
  format,
} from "date-fns";

import { useExamPlannerState } from "../composables/useExamPlannerState";
import { importSubjectsReplace } from "../utils/importSubjectsReplace";
import { importSubjectsMerge } from "../utils/importSubjectsMerge";
import { importRooms } from "../utils/importRooms";
import {
  exportPlannerJSON,
  exportPlannerCSV,
  exportPlannerTXT,
  exportPlannerExcel,
  exportPlannerWord,
} from "../utils/exporters";

import PlannerToolbar from "./PlannerToolbar.vue";
import SubjectsTray from "./SubjectsTray.vue";
import ExamCalendarGrid from "./ExamCalendarGrid.vue";
import TrashBin from "./TrashBin.vue";

import type { Subject, Period, RoomsDataPerPeriod } from "../types/examPlanner";

const {
  subjects,
  periods,
  activePid,
  slotsPerPeriod,
  assignedPerPeriod,
  roomsData,
  allowedPeriodsBySubject,
  hiddenSubjectIds,
  lastDeleted,
  saveStateToUrl,
  loadStateFromUrl,
  copyLinkToClipboard,
} = useExamPlannerState();

const roomsImportVersion = ref(0);

// --- Computed ---

const activePeriod = computed(() =>
  periods.value.find((p) => p.id === activePid.value)
);

const availableSubjects = computed(() => {
  if (!activePeriod.value) return [];
  return subjects.value.filter((s) => {
    // 1. Si està oculta, no surt
    if (hiddenSubjectIds.value.includes(s.id)) return false;

    // 2. Si ja està assignada en AQUEST període, no surt
    const amap = assignedPerPeriod.value[activePid.value] ?? {};
    const isAssignedHere = Object.values(amap).some((ids) =>
      ids.includes(s.id)
    );
    if (isAssignedHere) return false;

    // 3. Filtre per allowedPeriods (si existeix)
    const allowed = allowedPeriodsBySubject.value[s.id];
    if (allowed && allowed.length > 0 && !allowed.includes(activePid.value)) {
      return false;
    }

    // 4. Filtre per curs/quadrimestre del període (si el període en té)
    //    (Lògica original de React mantinguda)
    if (activePeriod.value.curs != null) {
      if (s.curs && Number(s.curs) !== activePeriod.value.curs) return false;
    }
    if (activePeriod.value.quad != null) {
      if (s.quadrimestre && s.quadrimestre !== activePeriod.value.quad)
        return false;
    }

    return true;
  });
});

// --- Handlers d'importació ---

function handleImportCSV(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        const {
          subjects: newSubjects,
          periods: newPeriods,
          slotsPerPeriod: newSlots,
          allowedPeriodsBySubject: newAllowed,
        } = importSubjectsReplace(results.data);

        if (
          confirm(
            `S'han trobat ${newSubjects.length} assignatures i ${newPeriods.length} períodes. Això REEMPLAÇARÀ les dades actuals. Continuar?`
          )
        ) {
          subjects.value = newSubjects;
          periods.value = newPeriods;
          slotsPerPeriod.value = newSlots;
          allowedPeriodsBySubject.value = newAllowed;
          assignedPerPeriod.value = {};
          roomsData.value = {};
          hiddenSubjectIds.value = [];
          lastDeleted.value = null;

          if (newPeriods.length > 0) {
            activePid.value = newPeriods[0].id;
          }
          alert("Importació completada correctament.");
        }
      } catch (e) {
        console.error(e);
        alert("Error important el CSV. Revisa el format.");
      }
      input.value = "";
    },
  });
}

function handleMergeSubjectsCSV(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        const {
          nextSubjects,
          nextPeriods,
          nextAllowed,
          nextSlotsPerPeriod,
          addedSubjects,
          updatedSubjects,
          addedPeriods,
          slotMigrationMap,
        } = importSubjectsMerge(results.data, {
          subjects: subjects.value,
          periods: periods.value,
          allowedPeriodsBySubject: allowedPeriodsBySubject.value,
          slotsPerPeriod: slotsPerPeriod.value,
        });

        const msg =
          `S'han afegit ${addedSubjects} assignatures noves.\n` +
          `S'han actualitzat ${updatedSubjects} assignatures existents.\n` +
          `S'han afegit ${addedPeriods} períodes nous.\n` +
          `Vols aplicar els canvis?`;

        if (confirm(msg)) {
          // --- Aplicar migració de slots ---
          // Si hi ha hagut canvis d'índexs en els slots, hem de moure les assignacions
          // assignedPerPeriod: pid -> cellKey -> subjectIds
          // roomsData: pid -> cellKey -> subjectId -> info

          const nextAssigned = { ...assignedPerPeriod.value };
          const nextRoomsData = { ...roomsData.value };

          if (slotMigrationMap && Object.keys(slotMigrationMap).length > 0) {
            for (const [pidStr, migration] of Object.entries(slotMigrationMap)) {
              const pid = Number(pidStr);
              if (!migration) continue;

              // 1. Migrar assignedPerPeriod
              if (nextAssigned[pid]) {
                const oldKeys = Object.keys(nextAssigned[pid]);
                const newPeriodAssigned: Record<string, string[]> = {};

                for (const oldKey of oldKeys) {
                  const [dateIso, slotIdxStr] = oldKey.split("|");
                  const oldSlotIdx = Number(slotIdxStr);
                  
                  // Si aquest slot ha canviat d'índex
                  if (migration[oldSlotIdx] !== undefined) {
                    const newSlotIdx = migration[oldSlotIdx];
                    const newKey = `${dateIso}|${newSlotIdx}`;
                    
                    // Moure dades a la nova clau
                    if (!newPeriodAssigned[newKey]) newPeriodAssigned[newKey] = [];
                    newPeriodAssigned[newKey].push(...nextAssigned[pid][oldKey]);
                  } else {
                    // Si no ha canviat, es queda igual (o potser ha desaparegut? 
                    // Assumim que si no està al map, es manté igual o s'esborra si el slot ja no existeix.
                    // Per seguretat, si no està al map, el deixem on era (suposant que no s'ha mogut).
                    if (!newPeriodAssigned[oldKey]) newPeriodAssigned[oldKey] = [];
                    newPeriodAssigned[oldKey].push(...nextAssigned[pid][oldKey]);
                  }
                }
                nextAssigned[pid] = newPeriodAssigned;
              }

              // 2. Migrar roomsData
              if (nextRoomsData[pid]) {
                const oldKeys = Object.keys(nextRoomsData[pid]);
                const newPeriodRooms: RoomsDataPerPeriod[number] = {};

                for (const oldKey of oldKeys) {
                  const [dateIso, slotIdxStr] = oldKey.split("|");
                  const oldSlotIdx = Number(slotIdxStr);

                  if (migration[oldSlotIdx] !== undefined) {
                    const newSlotIdx = migration[oldSlotIdx];
                    const newKey = `${dateIso}|${newSlotIdx}`;
                    
                    if (!newPeriodRooms[newKey]) newPeriodRooms[newKey] = {};
                    Object.assign(newPeriodRooms[newKey], nextRoomsData[pid][oldKey]);
                  } else {
                    if (!newPeriodRooms[oldKey]) newPeriodRooms[oldKey] = {};
                    Object.assign(newPeriodRooms[oldKey], nextRoomsData[pid][oldKey]);
                  }
                }
                nextRoomsData[pid] = newPeriodRooms;
              }
            }
          }

          subjects.value = nextSubjects;
          periods.value = nextPeriods;
          allowedPeriodsBySubject.value = nextAllowed;
          slotsPerPeriod.value = nextSlotsPerPeriod;
          assignedPerPeriod.value = nextAssigned;
          roomsData.value = nextRoomsData;
          
          alert("Merge completat (amb reajustament de franges).");
        }
      } catch (e) {
        console.error(e);
        alert("Error fent merge del CSV.");
      }
      input.value = "";
    },
  });
}

function handleImportRoomsCSV(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        const { nextRooms, attached, skipped } = importRooms(results.data, {
          subjects: subjects.value,
          periods: periods.value,
          roomsData: roomsData.value,
          slotsPerPeriod: slotsPerPeriod.value,
          assignedPerPeriod: assignedPerPeriod.value,
        });

        if (
          confirm(
            `S'han vinculat ${attached} registres d'aules/estudiants.\n` +
            `S'han ignorat ${skipped} files (no casaven amb cap assignatura/franja).\n` +
            `Vols aplicar els canvis?`
          )
        ) {
          roomsData.value = nextRooms;
          triggerRef(roomsData);
          roomsImportVersion.value++;
          alert("Importació d'aules completada.");
        }
      } catch (e) {
        console.error(e);
        alert("Error important el CSV d'aules.");
      }
      input.value = "";
    },
  });
}

function importJSON(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string;
      const data = JSON.parse(json);
      if (
        confirm(
          "Això REEMPLAÇARÀ totes les dades actuals amb les del fitxer JSON. Estàs segur?"
        )
      ) {
        if (Array.isArray(data.subjects)) subjects.value = data.subjects;
        if (Array.isArray(data.periods)) periods.value = data.periods;
        if (data.slotsPerPeriod) slotsPerPeriod.value = data.slotsPerPeriod;
        if (data.assignedPerPeriod) assignedPerPeriod.value = data.assignedPerPeriod;
        if (data.roomsData) roomsData.value = data.roomsData;
        if (data.allowedPeriodsBySubject)
          allowedPeriodsBySubject.value = data.allowedPeriodsBySubject;
        if (Array.isArray(data.hiddenSubjectIds))
          hiddenSubjectIds.value = data.hiddenSubjectIds;
        
        // Reset activePid if needed or keep existing if valid
        if (periods.value.length > 0 && !periods.value.find(p => p.id === activePid.value)) {
            activePid.value = periods.value[0].id;
        }

        alert("Dades carregades del JSON.");
      }
    } catch (err) {
      console.error(err);
      alert("Error llegint el fitxer JSON.");
    }
    input.value = "";
  };
  reader.readAsText(file);
}

// --- Wrappers d'exportació ---

const handleExportJSON = () =>
  exportPlannerJSON({
    periods: periods.value,
    slotsPerPeriod: slotsPerPeriod.value,
    assignedPerPeriod: assignedPerPeriod.value,
    subjects: subjects.value,
    roomsData: roomsData.value,
    allowedPeriodsBySubject: allowedPeriodsBySubject.value,
    hiddenSubjectIds: hiddenSubjectIds.value,
  });

const handleExportCSV = () =>
  exportPlannerCSV({
    periods: periods.value,
    slotsPerPeriod: slotsPerPeriod.value,
    assignedPerPeriod: assignedPerPeriod.value,
    subjects: subjects.value,
  });

const handleExportTXT = () =>
  exportPlannerTXT({
    periods: periods.value,
    slotsPerPeriod: slotsPerPeriod.value,
    assignedPerPeriod: assignedPerPeriod.value,
    subjects: subjects.value,
  });

const handleExportExcel = () =>
  exportPlannerExcel({
    periods: periods.value,
    slotsPerPeriod: slotsPerPeriod.value,
    assignedPerPeriod: assignedPerPeriod.value,
    subjects: subjects.value,
    roomsData: roomsData.value,
  });

const handleExportWord = () =>
  exportPlannerWord({
    periods: periods.value,
    slotsPerPeriod: slotsPerPeriod.value,
    assignedPerPeriod: assignedPerPeriod.value,
    subjects: subjects.value,
    roomsData: roomsData.value,
  });

// --- Gestió de Períodes ---

function addPeriod() {
  const newId =
    periods.value.length > 0
      ? Math.max(...periods.value.map((p) => p.id)) + 1
      : 1;
  const today = new Date();
  
  function mondayOfWeek(d: Date) {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const res = new Date(d);
    res.setDate(d.getDate() - diff);
    res.setHours(0,0,0,0);
    return res;
  }
  function fridayOfWeek(d: Date) {
    const mon = mondayOfWeek(d);
    const res = new Date(mon);
    res.setDate(mon.getDate() + 4);
    res.setHours(0,0,0,0);
    return res;
  }

  const startStr = format(mondayOfWeek(today), "yyyy-MM-dd");
  const endStr = format(fridayOfWeek(today), "yyyy-MM-dd");

  periods.value.push({
    id: newId,
    label: `Període ${newId}`,
    tipus: "PARCIAL",
    startStr,
    endStr,
    blackouts: [],
  });

  slotsPerPeriod.value[newId] = [
    { start: "08:00", end: "10:00" },
    { start: "10:30", end: "12:30" },
    { start: "15:00", end: "17:00" },
  ];

  activePid.value = newId;
}

function removePeriod(pid: number) {
  if (!confirm("Segur que vols eliminar aquest període?")) return;
  periods.value = periods.value.filter((p) => p.id !== pid);
  delete slotsPerPeriod.value[pid];
  delete assignedPerPeriod.value[pid];
  delete roomsData.value[pid];

  if (activePid.value === pid) {
    activePid.value = periods.value[0]?.id ?? 0;
  }
}

// --- Drag & Drop Logic ---

function handleDropOnTrash(data: string) {
  // data format: "placed:pid:dateIso:slotIndex:subjectId" OR "subjectId" (from tray)
  
  if (data.startsWith("placed:")) {
    // Moure de cel·la a paperera -> eliminar assignació
    const parts = data.split(":");
    // placed:pid:dateIso:slotIndex:subjectId
    const pid = Number(parts[1]);
    const dateIso = parts[2];
    const slotIndex = Number(parts[3]);
    const subjectId = parts.slice(4).join(":"); // per si l'ID té :

    removeOneFromCell(pid, dateIso, slotIndex, subjectId);
  } else {
    // De la safata a la paperera -> ocultar (soft delete)
    const subjectId = data;
    const s = subjects.value.find((x) => x.id === subjectId);
    if (!s) return;

    // Guardar snapshot per desfer
    lastDeleted.value = {
      subject: s,
      allowedPeriods: allowedPeriodsBySubject.value[s.id],
      placed: {}, // No estava col·locada, venia de la safata
      rooms: {},
    };

    hiddenSubjectIds.value.push(subjectId);
  }
}

function handleDropOnCell(pid: number, dateIso: string, slotIndex: number, data: string) {
  // data format: "placed:oldPid:oldDate:oldSlot:subjectId" OR "subjectId"
  
  let subjectId = data;
  let isMove = false;
  let oldPid = -1;
  let oldDate = "";
  let oldSlot = -1;

  if (data.startsWith("placed:")) {
    const parts = data.split(":");
    oldPid = Number(parts[1]);
    oldDate = parts[2];
    oldSlot = Number(parts[3]);
    subjectId = parts.slice(4).join(":");
    isMove = true;
  }

  // Verificar si ja existeix a la cel·la destí
  const key = `${dateIso}|${slotIndex}`;
  if (!assignedPerPeriod.value[pid]) assignedPerPeriod.value[pid] = {};
  const currentList = assignedPerPeriod.value[pid][key] ?? [];
  
  if (currentList.includes(subjectId)) {
    // Ja hi és, no fem res (o podríem avisar)
    return;
  }

  // Si és moure, treure de l'origen
  if (isMove) {
    removeOneFromCell(oldPid, oldDate, oldSlot, subjectId);
  }

  // Afegir a destí
  if (!assignedPerPeriod.value[pid][key]) assignedPerPeriod.value[pid][key] = [];
  assignedPerPeriod.value[pid][key].push(subjectId);
}

function removeOneFromCell(pid: number, dateIso: string, slotIndex: number, subjectId: string) {
  const key = `${dateIso}|${slotIndex}`;
  if (!assignedPerPeriod.value[pid]?.[key]) return;

  assignedPerPeriod.value[pid][key] = assignedPerPeriod.value[pid][key].filter(
    (id) => id !== subjectId
  );
}

// --- Restaurar ocults ---

function restoreHidden(id: string) {
  hiddenSubjectIds.value = hiddenSubjectIds.value.filter((x) => x !== id);
}

function restoreAllHidden() {
  hiddenSubjectIds.value = [];
}

function undoDelete() {
  if (!lastDeleted.value) return;
  const { subject, allowedPeriods, placed, rooms } = lastDeleted.value;

  // 1. Restaurar a la llista d'ocults (treure-la d'allà)
  hiddenSubjectIds.value = hiddenSubjectIds.value.filter(
    (id) => id !== subject.id
  );

  // 2. Restaurar allowedPeriods
  if (allowedPeriods) {
    allowedPeriodsBySubject.value[subject.id] = allowedPeriods;
  }

  // 3. Restaurar posicions (placed)
  // placed: pid -> [cellKey1, cellKey2...]
  for (const [pidStr, cellKeys] of Object.entries(placed)) {
    const pid = Number(pidStr);
    if (!assignedPerPeriod.value[pid]) assignedPerPeriod.value[pid] = {};
    for (const k of cellKeys) {
      if (!assignedPerPeriod.value[pid][k]) assignedPerPeriod.value[pid][k] = [];
      if (!assignedPerPeriod.value[pid][k].includes(subject.id)) {
        assignedPerPeriod.value[pid][k].push(subject.id);
      }
    }
  }

  // 4. Restaurar rooms
  for (const [pidStr, cellMap] of Object.entries(rooms)) {
    const pid = Number(pidStr);
    if (!roomsData.value[pid]) roomsData.value[pid] = {};
    for (const [cellKey, info] of Object.entries(cellMap)) {
      if (!roomsData.value[pid][cellKey]) roomsData.value[pid][cellKey] = {};
      roomsData.value[pid][cellKey][subject.id] = info;
    }
  }

  lastDeleted.value = null;
}

</script>

<template>
  <div class="p-6 max-w-[1200px] mx-auto">
    <h1 class="text-2xl font-bold mb-2">
      Planificador d'exàmens — períodes amb curs/quadrimestre
    </h1>
    <p class="text-sm text-gray-600 mb-6">
      Arrossega les assignatures de la safata al calendari.
      <br />
      Pots configurar múltiples períodes (Parcials, Finals, Reavaluació), cadascun
      amb les seves franges i dies.
    </p>

    <PlannerToolbar
      :availableSubjects="availableSubjects"
      :subjects="subjects"
      :lastDeleted="lastDeleted"
      :periods="periods"
      :activePid="activePid"
      @set-active-pid="(id) => activePid = id"
      @add-period="addPeriod"
      @remove-period="removePeriod"
      @import-csv="handleImportCSV"
      @merge-subjects-csv="handleMergeSubjectsCSV"
      @import-rooms-csv="handleImportRoomsCSV"
      @export-csv="handleExportCSV"
      @export-txt="handleExportTXT"
      @export-excel="handleExportExcel"
      @export-word="handleExportWord"
      @export-json="handleExportJSON"
      @import-json="importJSON"
      @save-state-url="saveStateToUrl"
      @load-state-url="loadStateFromUrl"
      @copy-link="copyLinkToClipboard"
      @undo-delete="undoDelete"
      @set-last-deleted="(val) => lastDeleted = val"
    />

    <SubjectsTray
      :availableSubjects="availableSubjects"
      :subjects="subjects"
      :hiddenSubjectIds="hiddenSubjectIds"
      @restore-hidden="restoreHidden"
      @restore-all-hidden="restoreAllHidden"
    />

    <ExamCalendarGrid
      v-if="activePeriod"
      :key="roomsImportVersion"
      :activePeriod="activePeriod"
      :activePid="activePid"
      :slotsPerPeriod="slotsPerPeriod"
      :assignedPerPeriod="assignedPerPeriod"
      :subjects="subjects"
      :roomsData="roomsData"
      @remove-one-from-cell="removeOneFromCell"
      @drop-on-cell="handleDropOnCell"
    />

    <TrashBin @drop-trash="handleDropOnTrash" />
  </div>
</template>
