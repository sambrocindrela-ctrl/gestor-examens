// src/utils/importSubjectsMerge.ts
import { parseDateFromCell, normalizeCursAny, normalizeQuad, makeSubjectKey } from "./csvHelpers";
import type {
    Subject,
    Period,
    SlotsPerPeriod,
    TipusPeriode,
    TimeSlot,
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

    // pid -> oldIdx -> newIdx
    const slotMigrationMap: Record<number, Record<number, number>> = {};

    // Helper per parsejar slots (copiat de importSubjectsReplace o similar)
    const parseSlotsLocal = (raw: any): TimeSlot[] => {
        if (!raw) return [];
        return String(raw)
            .split(/[;,|]/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((pair) => {
                const mm = pair.match(
                    /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/
                );
                if (!mm) return null;
                const [_, a, b] = mm;
                const pad = (h: string) =>
                    h
                        .split(":")
                        .map((x) => x.padStart(2, "0"))
                        .join(":");
                return { start: pad(a || ""), end: pad(b || "") };
            })
            .filter(Boolean) as TimeSlot[];
    };

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
            // Dades del període que poden venir al CSV
            const tipusRaw = (
                r.period_tipus ??
                r.PERIOD_TIPUS ??
                r.tipo ??
                r.TIPO ??
                ""
            )
                .toString()
                .toUpperCase();

            const tipus: TipusPeriode | undefined =
                tipusRaw === "FINAL"
                    ? "FINAL"
                    : tipusRaw === "REAVALUACIO" ||
                        tipusRaw === "REAVALUACIÓ" ||
                        tipusRaw === "REAVALUACION"
                        ? "REAVALUACIÓ"
                        : tipusRaw === "PARCIAL"
                            ? "PARCIAL"
                            : undefined; // Si no ve informat, undefined

            const startStr =
                parseDateFromCell(
                    r.period_inici ?? r.PERIOD_INICI ?? r.start
                ) || "";
            const endStr =
                parseDateFromCell(
                    r.period_fi ?? r.PERIOD_FI ?? r.end
                ) || "";

            // Slots
            const slots = parseSlotsLocal(
                r.period_slots ?? r.PERIOD_SLOTS ?? r.slots
            );

            // Busquem si ja existeix
            const existingPeriod = nextPeriods.find((p) => p.id === pid);

            if (!existingPeriod) {
                // --- CREAR NOU PERÍODE ---
                nextPeriods.push({
                    id: pid,
                    label: `Període ${pid}`,
                    tipus: tipus ?? "PARCIAL", // Valor per defecte si és nou
                    startStr,
                    endStr,
                    blackouts: [],
                });

                // Slots per defecte o els que vinguin
                if (slots.length > 0) {
                    nextSlotsPerPeriod[pid] = slots;
                } else {
                    nextSlotsPerPeriod[pid] = [{ start: "08:00", end: "10:00" }];
                }

                addedPeriods++;
            } else {
                // --- ACTUALITZAR PERÍODE EXISTENT ---
                // Només actualitzem si el CSV porta valor (no buit)
                if (tipus) existingPeriod.tipus = tipus;
                if (startStr) existingPeriod.startStr = startStr;
                if (endStr) existingPeriod.endStr = endStr;

                // Actualitzar slots si en venen
                if (slots.length > 0) {
                    // Calcular migració d'índexs
                    const oldSlots = nextSlotsPerPeriod[pid] || [];
                    const migration: Record<number, number> = {};

                    oldSlots.forEach((oldSlot, oldIdx) => {
                        const newIdx = slots.findIndex(
                            (s) => s.start === oldSlot.start && s.end === oldSlot.end
                        );
                        if (newIdx !== -1 && newIdx !== oldIdx) {
                            migration[oldIdx] = newIdx;
                        }
                    });

                    if (Object.keys(migration).length > 0) {
                        if (!slotMigrationMap[pid]) slotMigrationMap[pid] = {};
                        Object.assign(slotMigrationMap[pid], migration);
                    }

                    nextSlotsPerPeriod[pid] = slots;
                }
            }

            // Actualitzar allowedPeriodsBySubject
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
        slotMigrationMap,
    };
}
