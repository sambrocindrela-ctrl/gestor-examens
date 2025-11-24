// src/utils/importRooms.ts

import type {
  Subject,
  Period,
  SlotsPerPeriod,
  RoomsDataPerPeriod,
} from "../types/examPlanner";

/**
 * Importa Aules + Matriculats a partir de les files d'un CSV.
 *
 * Rep:
 *  - rows: files parsejades del CSV (Papa.parse(...).data filtrat)
 *  - context: estat actual (subjects, periods, roomsData, slotsPerPeriod)
 *
 * Retorna:
 *  - nextRooms: nou RoomsDataPerPeriod
 *  - attached: nombre de files afegides
 *  - skipped: nombre de files descartades
 */
export function importRooms(
  rows: any[],
  context: {
    subjects: Subject[];
    periods: Period[];
    roomsData: RoomsDataPerPeriod;
    slotsPerPeriod: SlotsPerPeriod;
  }
) {
  const { subjects, periods, roomsData, slotsPerPeriod } = context;

  // Normalitza dates a "yyyy-MM-dd"
  const normDate = (raw: any): string | undefined => {
    if (raw == null) return undefined;
    const s = String(raw).trim();
    if (!s) return undefined;

    // Ja és ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd/mm/yyyy o dd-mm-yyyy
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;

    // Número d'Excel (43831, etc.)
    const n = Number(s);
    if (!Number.isNaN(n) && n > 40000 && n < 70000) {
      const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
      const d = new Date(excelEpoch.getTime() + n * 86400000);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    }

    return undefined;
  };

  // Normalitza hores a "HH:mm"
  const normTime = (raw: any): string | undefined => {
    if (raw == null) return undefined;
    let s = String(raw).trim();
    if (!s) return undefined;

    // Acceptem "14:45", "14:45:00", "14.45", "14-45"
    s = s.replace(".", ":").replace("-", ":");
    const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return undefined;
    const hh = m[1].padStart(2, "0");
    const mm = m[2];
    return `${hh}:${mm}`;
  };

  const findSubjectByCodeOrSigles = (
    codi: string,
    sigles: string
  ): Subject | undefined => {
    const c = codi.trim();
    const sgl = sigles.trim();
    return subjects.find(
      (s) => (c && s.codi === c) || (sgl && s.sigles === sgl)
    );
  };

  const cellKey = (dateIso: string, slotIndex: number): string =>
    `${dateIso}|${slotIndex}`;

  // Còpia profunda segura de roomsData (pid → cellKey → subjectId → {rooms,students})
  const nextRooms: RoomsDataPerPeriod =
    typeof structuredClone === "function"
      ? structuredClone(roomsData || {})
      : (JSON.parse(JSON.stringify(roomsData || {})) as RoomsDataPerPeriod);

  let attached = 0;
  let skipped = 0;

  for (const r of rows) {
    // --- Codi / sigles ---
    const codi = String(
      r.codi ?? r.CODI ?? r.codigo ?? r.CODIGO ?? r.code ?? ""
    ).trim();
    const sigles = String(
      r.sigles ??
        r.SIGLES ??
        r.siglas ??
        r.SIGLAS ??
        r.nom ??
        r.NOM ??
        ""
    ).trim();
    if (!codi && !sigles) {
      skipped++;
      continue;
    }

    const subj = findSubjectByCodeOrSigles(codi, sigles);
    if (!subj) {
      skipped++;
      continue;
    }

    // --- Període ---
    const pidRaw =
      r.period_id ??
      r.PERIOD_ID ??
      r.PeriodId ??
      r.periode ??
      r.PERIODE ??
      r.PERIode ??
      r.PERIODO ??
      r.PERIOD ??
      r.Period;
    const pid = pidRaw ? Number(pidRaw) : NaN;
    if (!Number.isFinite(pid) || !periods.some((p) => p.id === pid)) {
      skipped++;
      continue;
    }

    // --- Data d'examen ---
    const dateIso = normDate(
      r["dia d'examen"] ??
        r["dia examen"] ??
        r.data_examen ??
        r.dia ??
        r.DIA ??
        r.fecha ??
        r.FECHA ??
        r.data ??
        r.DATA ??
        r.day
    );
    if (!dateIso) {
      skipped++;
      continue;
    }

    // --- Franja horària ---
    const start = normTime(
      r["hora d'inici de l'examen"] ??
        r["hora inici examen"] ??
        r.hora_inici_examen ??
        r.hora_inici ??
        r.inici ??
        r.start ??
        r.HORA_INICI ??
        r.HORA_INI
    );
    const end = normTime(
      r["hora de fi de l'examen"] ??
        r["hora fi examen"] ??
        r.hora_fi_examen ??
        r.hora_fi ??
        r.fi ??
        r.end ??
        r.HORA_FI
    );
    if (!start || !end) {
      skipped++;
      continue;
    }

    const slots = slotsPerPeriod[pid] ?? [];
    if (!slots.length) {
      skipped++;
      continue;
    }
    const slotIndex = slots.findIndex(
      (s) => s.start === start && s.end === end
    );
    if (slotIndex === -1) {
      skipped++;
      continue;
    }

    // --- Aula ---
    const aula = String(
      r.aula ?? r.AULA ?? r.sala ?? r.SALA ?? r.room ?? r.ROOM ?? ""
    ).trim();
    if (!aula) {
      skipped++;
      continue;
    }

    // --- Estudiants ---
    const nStudRaw =
      r["número d'estudiants matriculats"] ??
      r["num_estudiants"] ??
      r.estudiants ??
      r.ESTUDIANTS ??
      r.matriculats ??
      r.MATRICULATS ??
      r.matriculados ??
      r.MATRICULADOS ??
      r.students ??
      r.STUDENTS ??
      r.ENROLLED ??
      r.enrolled;
    const nStudents =
      nStudRaw != null && String(nStudRaw).trim() !== ""
        ? Number(String(nStudRaw).replace(/[^\d]/g, ""))
        : undefined;

    // --- Escriure a nextRooms[pid][dateIso|slotIndex][subjectId] ---
    if (!nextRooms[pid]) nextRooms[pid] = {};
    const key = cellKey(dateIso, slotIndex);
    if (!nextRooms[pid][key]) nextRooms[pid][key] = {};
    if (!nextRooms[pid][key][subj.id]) {
      nextRooms[pid][key][subj.id] = { rooms: [] };
    }

    const entry = nextRooms[pid][key][subj.id];
    if (aula && !entry.rooms.includes(aula)) {
      entry.rooms.push(aula);
    }
    if (
      typeof nStudents === "number" &&
      Number.isFinite(nStudents) &&
      entry.students == null
    ) {
      entry.students = nStudents;
    }

    attached++;
  }

  return { nextRooms, attached, skipped };
}

