// src/utils/importSubjectsMerge.ts
import { parseDateFromCell, normalizeCursAny, normalizeQuad, makeSubjectKey } from "./csvHelpers";
import type {
  Subject,
  Period,
  SlotsPerPeriod,
  TipusPeriode,
} from "../types/examPlanner";

/**
 * Importa assignatures + períodes en mode MERGE.
 * Rep:
 *  - rows: files del CSV (ja parsejades amb Papa)
 *  - current: estat actual (subjects, periods, allowedPeriodsBySubject, slotsPerPeriod)
 *
 * Retorna:
 *  - nextSubjects, nextPeriods, nextAllowed, nextSlotsPerPeriod
 *  - counters: addedSubjects, updatedSubjects, addedPeriods
 */
export function importSubjectsMerge(
  rows: any[],
  current: {
    subjects: Subject[];
    periods: Period[];
    allowedPeriodsBySubject: Record<string, number[]>;
    slotsPerPeriod: SlotsPerPeriod;
  }
) {
  const { subjects, periods, allowedPeriodsBySubject, slotsPerPeriod } = current;

  // Índexos auxiliars actuals
  const subjById = new Map(subjects.map((s) => [s.id, s] as const));
  const subjKeyIndex = new Map<string, string>(); // key -> subjectId
  for (const s of subjects) {
    const key = `${s.codi.trim().toLowerCase()}||${s.sigles.trim().toLowerCase()}`;
    subjKeyIndex.set(key, s.id);
  }

  const nextSubjects = [...subjects];
  const nextAllowed: Record<string, number[]> = { ...allowedPeriodsBySubject };
  const nextPeriods = [...periods];
  const nextSlotsPerPeriod: SlotsPerPeriod = JSON.parse(
    JSON.stringify(slotsPerPeriod)
  );

  let addedSubjects = 0;
  let updatedSubjects = 0;
  let addedPeriods = 0;

  for (const r of rows) {
    const codi = r.codi ?? r.codigo ?? r.CODI ?? r.CODIGO ?? r.code;
    const sigles = r.sigles ?? r.SIGLES ?? r.siglas ?? r.SIGLAS;
    if (!codi && !sigles) continue;

    const k = makeSubjectKey(codi, sigles);

    const nivell = (r.nivell ?? r.NIVELL ?? r.nivel ?? r.NIVEL)?.toString();
    const curs = normalizeCursAny(r.curs ?? r.CURS ?? r.curso ?? r.CURSO);
    const quadrimestre = normalizeQuad(
      r.quadrimestre ?? r.QUADRIMESTRE ?? r.quad ?? r.QUAD
    );

    const MET = r.MET ?? r.met;
    const MATT = r.MATT ?? r.matt;
    const MEE = r.MEE ?? r.mee;
    const MCYBERS = r.MCYBERS ?? r.mcybers;

    // ---------- SUBJECTE ----------
    let subjectId = subjKeyIndex.get(k);
    if (!subjectId) {
      // Nou subjecte
      subjectId = String(codi || sigles);
      subjKeyIndex.set(k, subjectId);
      nextSubjects.push({
        id: subjectId,
        codi: String(codi || ""),
        sigles: String(sigles || ""),
        nivell: nivell || undefined,
        curs: curs || undefined,
        quadrimestre: quadrimestre,
        MET: MET ? String(MET) : undefined,
        MATT: MATT ? String(MATT) : undefined,
        MEE: MEE ? String(MEE) : undefined,
        MCYBERS: MCYBERS ? String(MCYBERS) : undefined,
      });
      addedSubjects++;
    } else {
      // Subjecte existent → actualitzar segons CSV
      const s =
        subjById.get(subjectId) ||
        nextSubjects.find((x) => x.id === subjectId)!;

      let changed = false;

      if (s.nivell !== (nivell || undefined)) {
        s.nivell = nivell || undefined;
        changed = true;
      }

      if (s.curs !== (curs || undefined)) {
        s.curs = curs || undefined;
        changed = true;
      }

      if (s.quadrimestre !== quadrimestre) {
        s.quadrimestre = quadrimestre;
        changed = true;
      }

      const METstr = MET ? String(MET) : undefined;
      if (s.MET !== METstr) {
        s.MET = METstr;
        changed = true;
      }

      const MATTstr = MATT ? String(MATT) : undefined;
      if (s.MATT !== MATTstr) {
        s.MATT = MATTstr;
        changed = true;
      }

      const MEEstr = MEE ? String(MEE) : undefined;
      if (s.MEE !== MEEstr) {
        s.MEE = MEEstr;
        changed = true;
      }

      const MCYBERSstr = MCYBERS ? String(MCYBERS) : undefined;
      if (s.MCYBERS !== MCYBERSstr) {
        s.MCYBERS = MCYBERSstr;
        changed = true;
      }

      if (changed) {
        updatedSubjects++;
      }
    }

    // ---------- PERÍODES / ALLOWED PER SUBJECTE ----------
    const pidRaw =
      r.period_id ??
      r.PERIOD_ID ??
      r.PeriodId ??
      r.periode ??
      r.PERIODO ??
      r.PERIOD;
    const pid = pidRaw ? Number(pidRaw) : NaN;

    if (Number.isFinite(pid) && pid >= 1) {
      // Afegir període si no existeix
      if (!nextPeriods.find((p) => p.id === pid)) {
        const tipusRaw = (
          r.period_tipus ??
          r.PERIOD_TIPUS ??
          r.tipo ??
          r.TIPO ??
          ""
        )
          .toString()
          .toUpperCase();

        const tipus: TipusPeriode =
          tipusRaw === "FINAL"
            ? "FINAL"
            : tipusRaw === "REAVALUACIO" ||
              tipusRaw === "REAVALUACIÓ" ||
              tipusRaw === "REAVALUACION"
            ? "REAVALUACIÓ"
            : "PARCIAL";

        const startStr =
          parseDateFromCell(
            r.period_inici ?? r.PERIOD_INICI ?? r.start
          ) || "";
        const endStr =
          parseDateFromCell(
            r.period_fi ?? r.PERIOD_FI ?? r.end
          ) || "";

        nextPeriods.push({
          id: pid,
          label: `Període ${pid}`,
          tipus,
          startStr,
          endStr,
          blackouts: [],
        });

        nextSlotsPerPeriod[pid] =
          nextSlotsPerPeriod[pid] ?? [{ start: "08:00", end: "10:00" }];

        addedPeriods++;
      }

      const arr = new Set(nextAllowed[subjectId] ?? []);
      arr.add(pid);
      nextAllowed[subjectId] = Array.from(arr).sort(
        (a, b) => a - b
      );
    }
  }

  // Ordenem períodes pel seu id
  nextPeriods.sort((a, b) => a.id - b.id);

  return {
    nextSubjects,
    nextPeriods,
    nextAllowed,
    nextSlotsPerPeriod,
    addedSubjects,
    updatedSubjects,
    addedPeriods,
  };
}

