<script setup lang="ts">
import { ref } from "vue";
import type { Subject, Period } from "../types/examPlanner";
import type { CalendarSummary } from "../types/savedCalendar";
import { importExcelCalendar, type ImportedCalendarData } from "../utils/importExcelCalendar";
import { useDarkColors } from "../composables/useDarkColors";

const props = defineProps<{
  availableSubjects: Subject[];
  subjects: Subject[];
  lastDeleted: { subject: Subject } | null;
  periods: Period[];
  activePid: number;
  isAdminMode: boolean;

  savedCalendars: CalendarSummary[];
  selectedCalendarId: string;
  selectedTitulacio: string;
  titulacionsDisponibles: string[];
  isTitulacioLocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'undo-delete'): void;
  (e: 'set-last-deleted', val: any): void;
  (e: 'set-active-pid', id: number): void;
  (e: 'add-period'): void;
  (e: 'remove-period', pid: number): void;

  // Import/Export events
  (e: 'import-csv', event: Event): void;
  (e: 'merge-subjects-csv', event: Event): void;
  (e: 'import-rooms-csv', event: Event): void;
  (e: 'import-json', event: Event): void;
  (e: 'import-calendar-data', data: ImportedCalendarData): void;

  (e: 'export-csv'): void;
  (e: 'export-txt'): void;
  (e: 'export-excel'): void;
  (e: 'export-gef-excel'): void;
  (e: 'export-word'): void;
  (e: 'export-json'): void;

  (e: 'save-state'): void;
  (e: 'load-state'): void;
  (e: 'copy-link'): void;

  (e: 'save-supabase'): void;
  (e: 'list-supabase-calendars'): void;
  (e: 'load-latest-supabase-calendar'): void;
  (e: 'load-selected-supabase-calendar', id: string): void;
  (e: 'rename-selected-supabase-calendar'): void;
  (e: 'delete-selected-supabase-calendar'): void;
  (e: 'set-selected-calendar-id', id: string): void;
  (e: 'set-selected-titulacio', value: string): void;
  (e: 'apply-supabase-template'): void;
  (e: 'explain-template-use'): void;

  (e: 'toggle-admin-mode', password?: string): boolean;
}>();

const totalSubjects = props.subjects.length;
const availableCount = props.availableSubjects.length;
const assignedCount = totalSubjects - availableCount;

const showPasswordDialog = ref(false);
const passwordInput = ref("");
const passwordError = ref(false);
const showAdvancedPanel = ref(false);

const {
  dark,
  primaryColor,
  secondaryColor,
  negativeColor,
  primaryTextClass,
  secondaryTextClass,
  mutedTextClass,
} = useDarkColors();

function getPeriodLabel(p: Period) {
  const tipus = p.tipus === "FINAL" ? "FINAL" : p.tipus === "REAVALUACIÓ" ? "REAVALUACIÓ" : "PARCIAL";
  const curs = p.curs ?? '';
  const quad = p.quad ?? '';

  // Build label: TIPUS CURS-QUADRIMESTRE
  let label = tipus;
  if (curs) {
    label += ` ${curs}`;
    if (quad) {
      label += `-${quad}`;
    }
  } else if (quad) {
    label += ` -${quad}`;
  }

  return label;
}

function attemptUnlock() {
  showPasswordDialog.value = true;
  passwordError.value = false;
  passwordInput.value = "";
}

function submitPassword() {
  const wasLocked = !props.isAdminMode;
  emit('toggle-admin-mode', passwordInput.value);

  // Use nextTick to check if unlock was successful after the parent updates
  setTimeout(() => {
    if (wasLocked && props.isAdminMode) {
      // Successfully unlocked
      showPasswordDialog.value = false;
      passwordInput.value = "";
      passwordError.value = false;
    } else if (wasLocked && !props.isAdminMode) {
      // Failed to unlock (wrong password)
      passwordError.value = true;
    }
  }, 50);
}

function lockAdmin() {
  emit('toggle-admin-mode');
}

function toggleAdvancedPanel() {
  if (!props.isAdminMode) return;
  showAdvancedPanel.value = !showAdvancedPanel.value;
}

function cancelPassword() {
  showPasswordDialog.value = false;
  passwordInput.value = "";
  passwordError.value = false;
}

function handleImportExcel(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importExcelCalendar(file, props.subjects)
    .then((data) => {
      emit('import-calendar-data', data);
      alert("Calendari llegit correctament. Actualitzant...");
    })
    .catch((err) => {
      console.error(err);
      alert("Error important el calendari Excel: " + err);
    })
    .finally(() => {
      input.value = "";
    });
}
</script>

<template>
  <section>
    <!-- Toolbar header -->
    <header class="flex flex-wrap items-center justify-between gap-md pb-8">
      <h4 :class="primaryTextClass" class="text-h4 q-ma-none text-weight-bold">Gestió del calendari</h4>

      <div class="flex items-center gap-2">
        <q-btn @click="toggleAdvancedPanel" :disable="!isAdminMode" :outline="!isAdminMode" :flat="isAdminMode"
          :color="primaryColor" icon="settings"
          :label="'Accions avançades' + (isAdminMode ? (showAdvancedPanel ? ' ▲' : ' ▼') : '')" />

        <q-btn v-if="!isAdminMode" @click="attemptUnlock" color="warning" outline icon="lock_open"
          label="Desbloquejar" />

        <q-btn v-else @click="lockAdmin" color="positive" outline icon="lock" label="Bloquejar" />
      </div>
    </header>

    <div class="q-gutter-y-md">
      <!-- Saved calendars card -->
      <q-card flat bordered class="bg-primary-50 dark:bg-primary-950">
        <q-card-section>
          <div :class="mutedTextClass" class="text-subtitle2 text-weight-bold q-mb-sm">
            Calendaris guardats
          </div>

          <div class="flex flex-wrap gap-2 items-center justify-between">
            <!-- Selectors row -->
            <div class="flex flex-row flex-wrap gap-4 items-center">
              <q-select :model-value="selectedTitulacio" :disable="props.isTitulacioLocked"
                @update:model-value="(val) => emit('set-selected-titulacio', val)"
                :options="[{ label: 'Totes les titulacions', value: '' }, ...titulacionsDisponibles.map(t => ({ label: t, value: t }))]"
                emit-value map-options outlined dense style="min-width: 220px;"
                :class="!dark ? 'bg-white' : ''" />

              <span v-if="props.isTitulacioLocked" class="text-caption text-grey-6">
                Titulació fixada per l'enllaç
              </span>

              <q-select :model-value="selectedCalendarId"
                @update:model-value="(val) => emit('set-selected-calendar-id', val)"
                :options="[{ label: 'Selecciona un calendari', value: '' }, ...savedCalendars.map(c => ({ label: c.name, value: c.id }))]"
                emit-value map-options outlined dense style="min-width: 320px;"
                :class="!dark ? 'bg-white' : ''" />
            </div>

            <!-- Actions row -->
            <div class="flex flex-row flex-wrap gap-2">
              <q-btn :color="primaryColor" @click="emit('save-supabase')" label="Guardar" icon="save" />
              <q-btn outline :color="primaryColor" @click="emit('load-latest-supabase-calendar')" label="Carregar últim" icon="history" />
              <q-btn outline :color="primaryColor" @click="emit('rename-selected-supabase-calendar')" label="Reanomenar" icon="edit" />

              <q-separator vertical class="q-mx-xs" />

              <q-btn outline :color="secondaryColor" @click="emit('export-excel')" label="Excel" icon="table_view" />
              <q-btn outline :color="secondaryColor" @click="emit('export-word')" label="Word" icon="description" />

              <q-separator vertical class="q-mx-xs" />

              <q-btn outline :color="negativeColor" @click="emit('delete-selected-supabase-calendar')" label="Eliminar" icon="delete" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Advanced panel (admin only) -->
      <q-card v-if="showAdvancedPanel" flat bordered :class="dark ? 'bg-grey-10' : 'bg-grey-1'">
        <q-card-section>
          <div :class="mutedTextClass" class="text-subtitle2 text-weight-bold q-mb-sm">
            <q-icon name="settings" class="q-mr-sm" /> Accions avançades
          </div>

          <q-card flat bordered :class="dark ? 'bg-grey-9' : 'bg-grey-2'" class="q-pa-md">
            <div :class="mutedTextClass" class="text-subtitle2 text-weight-bold q-mb-sm">
              <q-icon name="lock" class="q-mr-sm" /> Importació i exportació tècnica
            </div>

            <p class="text-caption text-grey-7 q-mb-md">
              CSV esperat: <code :class="dark ? 'bg-grey-8' : 'bg-grey-3'" class="q-pa-xs rounded-borders">codi,sigles,nivell,...</code>
              Opcional: <code :class="dark ? 'bg-grey-8' : 'bg-grey-3'" class="q-pa-xs rounded-borders">MET,MATT,MEE,MCYBERS</code>
            </p>

            <!-- Import actions -->
            <div class="flex flex-wrap gap-2 items-center q-mb-sm">
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" icon="upload_file" @click="$refs.importCsvBtn.pickFiles()">
                Importar CSV (REEMPLAÇA)
                <q-file v-show="false" ref="importCsvBtn" accept=".csv,text/csv"
                  @update:model-value="(val) => { if (val) emit('import-csv', { target: { files: [val] } }) }" />
              </q-btn>
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" icon="merge" @click="$refs.mergeCsvBtn.pickFiles()">
                Afegir assignatures (MERGE)
                <q-file v-show="false" ref="mergeCsvBtn" accept=".csv,text/csv"
                  @update:model-value="(val) => { if (val) emit('merge-subjects-csv', { target: { files: [val] } }) }" />
              </q-btn>
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" icon="room" @click="$refs.importRoomsBtn.pickFiles()">
                Importar Aules/Matriculats
                <q-file v-show="false" ref="importRoomsBtn" accept=".csv,text/csv"
                  @update:model-value="(val) => { if (val) emit('import-rooms-csv', { target: { files: [val] } }) }" />
              </q-btn>
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" icon="table_chart" @click="$refs.importExcelBtn.pickFiles()">
                Importar calendari Excel
                <q-file v-show="false" ref="importExcelBtn" accept=".xlsx, .xls"
                  @update:model-value="(val) => { if (val) handleImportExcel({ target: { files: [val] } }) }" />
              </q-btn>
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" icon="code" @click="$refs.importJsonBtn.pickFiles()">
                Importar JSON
                <q-file v-show="false" ref="importJsonBtn" accept="application/json"
                  @update:model-value="(val) => { if (val) emit('import-json', { target: { files: [val] } }) }" />
              </q-btn>
            </div>

            <q-separator class="q-my-sm" />

            <!-- Export actions -->
            <div class="flex flex-wrap gap-2 items-center q-mb-sm">
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" @click="emit('export-csv')" label="Exportar CSV" icon="download" />
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" @click="emit('export-txt')" label="Exportar TXT" icon="text_snippet" />
              <q-btn :disable="!isAdminMode" outline :color="primaryColor" @click="emit('export-json')" label="Exportar JSON" icon="data_object" />
              <q-btn outline :color="secondaryColor" @click="emit('export-gef-excel')" label="Exportar Excel GEF" icon="table_view" />
            </div>

            <q-separator class="q-my-sm" />

            <!-- URL / Link actions -->
            <div class="flex flex-wrap gap-2 items-center q-mb-sm">
              <q-btn :disable="!isAdminMode" outline :color="secondaryColor" @click="emit('save-state')" label="Guardar a URL" icon="link" />
              <q-btn :disable="!isAdminMode" outline :color="secondaryColor" @click="emit('load-state')" label="Carregar d'URL" icon="sync" />
              <q-btn :disable="!isAdminMode" outline :color="secondaryColor" @click="emit('copy-link')" label="Copiar enllaç" icon="content_copy" />
            </div>

            <q-separator class="q-my-sm" />

            <!-- Template actions -->
            <div class="flex flex-wrap gap-2 items-center">
              <q-btn :disable="!isAdminMode" outline color="accent" @click="emit('apply-supabase-template')" label="Aplicar plantilla" icon="auto_fix_high" />
              <q-btn :disable="!isAdminMode" flat color="info" @click="emit('explain-template-use')" label="Com funciona" icon="help_outline" />
            </div>
          </q-card>
        </q-card-section>
      </q-card>
    </div>

    <!-- Stats summary -->
    <p :class="mutedTextClass" class="q-mt-md q-mb-none text-caption">
      Disponibles a la safata: <strong>{{ availableCount }}</strong> de {{ totalSubjects }} ·
      Assignades al calendari: <strong>{{ assignedCount }}</strong>
    </p>

    <!-- Undo-delete banner -->
    <q-banner v-if="lastDeleted" inline-actions class="bg-warning text-dark q-mt-sm rounded-borders">
      <template v-slot:avatar>
        <q-icon name="warning" color="dark" />
      </template>
      Assignatura eliminada del catàleg:
      <strong>{{ lastDeleted.subject.sigles || lastDeleted.subject.codi }}</strong>
      <template v-slot:action>
        <q-btn flat color="dark" label="Desfer" @click="emit('undo-delete')" />
        <q-btn flat color="dark" label="Amaga" @click="emit('set-last-deleted', null)" />
      </template>
    </q-banner>

    <!-- Period selector -->
    <nav class="q-mt-md flex flex-wrap gap-2" aria-label="Períodes">
      <q-btn
        v-for="p in periods" :key="p.id"
        @click="emit('set-active-pid', p.id)"
        :unelevated="p.id === activePid"
        :outline="p.id !== activePid"
        :color="p.id === activePid ? primaryColor : 'grey-7'"
        :label="getPeriodLabel(p)"
      />
    </nav>

    <q-dialog v-model="showPasswordDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6"><q-icon name="lock" class="q-mr-sm" /> Introdueix contrasenya</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input dense v-model="passwordInput" type="password" autofocus @keyup.enter="submitPassword"
            :error="passwordError" error-message="❌ Contrasenya incorrecta. Torna-ho a intentar."
            label="Contrasenya d'administrador" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel·lar" @click="cancelPassword" />
          <q-btn color="primary" label="Desbloquejar" @click="submitPassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </section>
</template>
