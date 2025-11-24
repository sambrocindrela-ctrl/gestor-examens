// src/ExamPlannerFiles.tsx
import { importSubjectsReplace } from "./utils/importSubjectsReplace";
import { importSubjectsMerge } from "./utils/importSubjectsMerge";
import { importRooms } from "./utils/importRooms";
import {
  exportPlannerJSON,
  exportPlannerCSV,
  exportPlannerTXT,
  exportPlannerExcel,
  exportPlannerWord,
} from "./utils/exporters";

import { useMemo } from "react";
import { DndContext } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { format, addDays, subDays, startOfDay } from "date-fns";

import * as Papa from "papaparse";

import type {
  TipusPeriode,
  Period,
  AssignedMap,
  AssignedPerPeriod,
  RoomsEnroll,
  RoomsMapPerCell,
  RoomsDataPerPeriod,
} from "./types/examPlanner";

import { TrashBin } from "./components/TrashBin";
import { PlannerToolbar } from "./components/PlannerToolbar";
import { SubjectsTray } from "./components/SubjectsTray";
import { ExamCalendarGrid } from "./components/ExamCalendarGrid";

import { useExamPlannerState } from "./hooks/useExamPlannerState";

/* ---------- Helpers ---------- */
function mondayOfWeek(d: Date) {
  const day = d.getDay(); // 0=dg … 6=ds
  const diff = (day + 6) % 7; // 0 si dilluns
  return startOfDay(subDays(d, diff));
}
function fridayOfWeek(d: Date) {
  const mon = mondayOfWeek(d);
  return startOfDay(addDays(mon, 4));
}

/* ---------- Component principal ---------- */
export default function ExamPlannerCSV() {
  const {
    subjects,
    setSubjects,
    periods,
    setPeriods,
    activePid,
    setActivePid,
    slotsPerPeriod,
    setSlotsPerPeriod,
    assignedPerPeriod,
    setAssignedPerPeriod,
    roomsData,
    setRoomsData,
    allowedPeriodsBySubject,
    setAllowedPeriodsBySubject,
    hiddenSubjectIds,
    setHiddenSubjectIds,
    lastDeleted,
    setLastDeleted,
    saveStateToUrl,
    loadStateFromUrl,
    copyLinkToClipboard,
  } = useExamPlannerState();
  
    /* ---------- Wrappers d’exportació ---------- */

  const handleExportJSON = () =>
    exportPlannerJSON({
      periods,
      slotsPerPeriod,
      assignedPerPeriod,
      subjects,
      roomsData,
      allowedPeriodsBySubject,
      hiddenSubjectIds,
    });

  const handleExportCSV = () =>
    exportPlannerCSV({
      periods,
      slotsPerPeriod,
      assignedPerPeriod,
      subjects,
    });

  const handleExportTXT = () =>
    exportPlannerTXT({
      periods,
      slotsPerPeriod,
      assignedPerPeriod,
      subjects,
    });

  const handleExportExcel = () =>
    exportPlannerExcel({
      periods,
      slotsPerPeriod,
      assignedPerPeriod,
      subjects,
      roomsData,
    });

  const handleExportWord = () =>
    exportPlannerWord({
      periods,
      slotsPerPeriod,
      assignedPerPeriod,
      subjects,
      roomsData,
    });

  const activePeriod = periods.find((p) => p.id === activePid)!;

   function cellKey(dateIso: string, slotIndex: number) {
    return `${dateIso}|${slotIndex}`;
  }

  /* Assignatures ja utilitzades — NOMÉS en el període actiu */
  const usedIds = useMemo(() => {
    const amap = assignedPerPeriod[activePid] ?? {};
    const s = new Set<string>();
    for (const list of Object.values(amap)) for (const id of list) s.add(id);
    return s;
  }, [assignedPerPeriod, activePid]);

  /* Filtrat de la safata: quadrimestre + pertinença al període + no usada + no oculta */
  const availableSubjects = useMemo(() => {
const pcurs = activePeriod?.curs != null ? String(activePeriod.curs) : undefined;
const pquad = activePeriod?.quad;
const pid = activePid;

return subjects
  .filter((s) => !usedIds.has(s.id))
  .filter((s) => !hiddenSubjectIds.includes(s.id))
  .filter((s) => (pcurs ? s.curs === pcurs : true))
  .filter((s) => {
    const allowed = allowedPeriodsBySubject[s.id];

    // Si el CSV ha definit explícitament en quins períodes pot anar
    // aquesta assignatura, fem CAS a això i IGNOREM el quadrimestre
    // guardat al Subject (pot ser 1, però també ha de sortir al 2).
    if (Array.isArray(allowed)) {
      return allowed.includes(pid);
    }

    // Si no hi ha info de CSV per a aquesta assignatura,
    // mantenim el comportament antic: filtre per quadrimestre.
    return pquad ? s.quadrimestre === pquad : true;
  });


  }, [
    subjects,
    usedIds,
    activePeriod?.curs,
    activePeriod?.quad,
    activePid,
    allowedPeriodsBySubject,
    hiddenSubjectIds,
  ]);

  /* DnD - arrossegar des de safata o moure entre cel·les */

  function onDragEnd(e: any) {
    const activeId = e.active?.id as string | undefined;
    const dropId = e.over?.id as string | undefined;
    if (!activeId || !dropId) return;

    // 🗑️ Paperera global: eliminar del catàleg
    if (dropId === "trash:catalog") {
      // subjectId pot venir de safata (id = subjectId) o de calendari (placed:pid:dateIso:slotIndex:subjectId)
      const subjectId = activeId.startsWith("placed:")
        ? activeId.split(":").slice(-1)[0]
        : activeId;

      deleteSubjectPermanently(subjectId);
      return;
    }

    // Resta: drop a una cel·la de calendari
    if (!dropId.startsWith("cell:")) return;

    // dropId = cell:periodId:YYYY-MM-DD:slotIndex
    const [, dropPidStr, dropDateIso, dropSlotIndexStr] = dropId.split(":");
    const dropPid = Number(dropPidStr);
    const dropKey = cellKey(dropDateIso, Number(dropSlotIndexStr));

    if (activeId.startsWith("placed:")) {
      // Moure entre cel·les: placed:pid:dateIso:slotIndex:subjectId
      const [, srcPidStr, srcDateIso, srcSlotIndexStr, subjectId] =
        activeId.split(":");
      const srcPid = Number(srcPidStr);
      const srcKey = cellKey(srcDateIso, Number(srcSlotIndexStr));
      if (srcPid !== dropPid) return; // només dins del període actiu
      setAssignedPerPeriod((prev) => {
        const amap = { ...(prev[srcPid] ?? {}) };
        amap[srcKey] = (amap[srcKey] ?? []).filter((id) => id !== subjectId);
        if (!amap[srcKey]?.length) delete amap[srcKey];
        const destList = new Set(amap[dropKey] ?? []);
        destList.add(subjectId);
        amap[dropKey] = Array.from(destList);
        return { ...prev, [srcPid]: amap };
      });
      return;
    }

    // Si no és 'placed', és un id d’assignatura de la safata
    const subjectId = activeId;
    setAssignedPerPeriod((prev) => {
      const prevMap = prev[dropPid] ?? {};
      const nextList = new Set(prevMap[dropKey] ?? []);
      nextList.add(subjectId);
      return {
        ...prev,
        [dropPid]: { ...prevMap, [dropKey]: Array.from(nextList) },
      };
    });
  }

  function removeOneFromCell(
    pid: number,
    dateIso: string,
    slotIndex: number,
    subjectId: string
  ) {
    const key = cellKey(dateIso, slotIndex);
    setAssignedPerPeriod((prev) => {
      const prevMap = prev[pid] ?? {};
      const next = (prevMap[key] ?? []).filter((id) => id !== subjectId);
      const copy: AssignedMap = { ...prevMap };
      if (next.length) copy[key] = next;
      else delete copy[key];
      return { ...prev, [pid]: copy };
    });
  }

  /* --- Eliminar definitivament un subjecte del catàleg (amb Desfer) --- */
  function deleteSubjectPermanently(subjectId: string) {
    const subj = subjects.find((s) => s.id === subjectId);
    if (!subj) return;
    if (
      !confirm(
        `Eliminar definitivament "${
          subj.sigles || subj.codi
        }" del catàleg?\nS’esborrarà de la safata, del calendari i de les dades d’aules/estudiants.`
      )
    ) {
      return;
    }

    // 1) Snapshot per Desfer
    const placed: Record<number, string[]> = {};
    for (const [pidStr, amap] of Object.entries(assignedPerPeriod)) {
      const pid = Number(pidStr);
      const cells: string[] = [];
      for (const [cell, ids] of Object.entries(amap)) {
        if (ids.includes(subjectId)) cells.push(cell);
      }
      if (cells.length) placed[pid] = cells;
    }
    const roomsSnap: Record<number, Record<string, RoomsEnroll>> = {};
    for (const [pidStr, per] of Object.entries(roomsData)) {
      const pid = Number(pidStr);
      const perOut: Record<string, RoomsEnroll> = {};
      for (const [cellKey, map] of Object.entries(per)) {
        const entry = map[subjectId];
        if (entry)
          perOut[cellKey] = {
            rooms: [...(entry.rooms || [])],
            students: entry.students,
          };
      }
      if (Object.keys(perOut).length) roomsSnap[pid] = perOut;
    }
    const allowed = allowedPeriodsBySubject[subjectId];
    setLastDeleted({
      subject: subj,
      allowedPeriods: allowed ? [...allowed] : undefined,
      placed,
      rooms: roomsSnap,
    });

    // 2) Elimina de l’estat
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));

    setAllowedPeriodsBySubject((prev) => {
      const { [subjectId]: _drop, ...rest } = prev;
      return rest;
    });

    setHiddenSubjectIds((prev) => prev.filter((id) => id !== subjectId));

    setAssignedPerPeriod((prev) => {
      const copy: AssignedPerPeriod = {};
      for (const [pidStr, amap] of Object.entries(prev)) {
        const newMap: AssignedMap = {};
        for (const [cell, ids] of Object.entries(amap)) {
          const next = ids.filter((id) => id !== subjectId);
          if (next.length) newMap[cell] = next;
        }
        copy[Number(pidStr)] = newMap;
      }
      return copy;
    });

    setRoomsData((prev) => {
      const out: RoomsDataPerPeriod = {};
      for (const [pidStr, per] of Object.entries(prev)) {
        const newPer: Record<string, RoomsMapPerCell> = {};
        for (const [cellKey, map] of Object.entries(per)) {
          const { [subjectId]: _drop, ...rest } = map;
          if (Object.keys(rest).length) newPer[cellKey] = rest;
        }
        out[Number(pidStr)] = newPer;
      }
      return out;
    });
  }

  function undoDelete() {
    if (!lastDeleted) return;
    const snap = lastDeleted;

    // 1) subjecte
    setSubjects((prev) => {
      if (prev.some((s) => s.id === snap.subject.id)) return prev;
      return [...prev, snap.subject];
    });

    // 2) allowedPeriods
    if (snap.allowedPeriods) {
      setAllowedPeriodsBySubject((prev) => ({
        ...prev,
        [snap.subject.id]: [...snap.allowedPeriods!],
      }));
    }

    // 3) col·locacions
    setAssignedPerPeriod((prev) => {
      const copy: AssignedPerPeriod = { ...prev };
      for (const [pidStr, cells] of Object.entries(snap.placed)) {
        const pid = Number(pidStr);
        const amap = { ...(copy[pid] ?? {}) };
        for (const cell of cells) {
          const setIds = new Set(amap[cell] ?? []);
          setIds.add(snap.subject.id);
          amap[cell] = Array.from(setIds);
        }
        copy[pid] = amap;
      }
      return copy;
    });

    // 4) rooms
    setRoomsData((prev) => {
      const out: RoomsDataPerPeriod = JSON.parse(
        JSON.stringify(prev || {})
      );
      for (const [pidStr, per] of Object.entries(snap.rooms)) {
        const pid = Number(pidStr);
        out[pid] = out[pid] || {};
        for (const [cellKey, info] of Object.entries(per)) {
          out[pid][cellKey] = out[pid][cellKey] || {};
          out[pid][cellKey][snap.subject.id] = {
            rooms: [...(info.rooms || [])],
            students: info.students,
          };
        }
      }
      return out;
    });

    setLastDeleted(null);
  }

  /* Gestió períodes */
  function addPeriod() {
    if (periods.length >= 5) {
      alert("Pots tenir com a màxim 5 períodes.");
      return;
    }
    const newId = Math.max(0, ...periods.map((p) => p.id)) + 1;
    const today = new Date();
    const newPeriod: Period = {
      id: newId,
      label: `Període ${newId}`,
      tipus: "PARCIAL",
      startStr: format(mondayOfWeek(today), "yyyy-MM-dd"),
      endStr: format(fridayOfWeek(today), "yyyy-MM-dd"),
      curs: undefined,
      quad: undefined,
      blackouts: [],
    };
    setPeriods([...periods, newPeriod]);
    setSlotsPerPeriod((sp) => ({
      ...sp,
      [newId]: [{ start: "08:00", end: "10:00" }],
    }));
    setActivePid(newId);
  }
  function removePeriod(id: number) {
    if (!confirm("Segur que vols eliminar aquest període?")) return;
    setPeriods(periods.filter((p) => p.id !== id));
    setAssignedPerPeriod((ap) => {
      const c = { ...ap };
      delete c[id];
      return c;
    });
    setSlotsPerPeriod((sp) => {
      const c = { ...sp };
      delete c[id];
      return c;
    });
    setRoomsData((rd) => {
      const c = { ...rd };
      delete c[id];
      return c;
    });
  }

  /* ---------- Import JSON calendaris fets ---------- */
  function importJSON(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.periods)) setPeriods(data.periods);
        if (data.slotsPerPeriod) setSlotsPerPeriod(data.slotsPerPeriod);
        if (data.assignedPerPeriod)
          setAssignedPerPeriod(data.assignedPerPeriod);
        if (Array.isArray(data.subjects)) setSubjects(data.subjects);
        if (data.roomsData) setRoomsData(data.roomsData);
        if (data.allowedPeriodsBySubject)
          setAllowedPeriodsBySubject(data.allowedPeriodsBySubject);
        if (Array.isArray(data.hiddenSubjectIds))
          setHiddenSubjectIds(data.hiddenSubjectIds);
        if (Array.isArray(data.periods) && data.periods.length)
          setActivePid(data.periods[0].id);
      } catch {
        alert("JSON no vàlid");
      }
    };
    reader.readAsText(f);
    ev.currentTarget.value = "";
  }

/* ---------- Import CSV (assignatures + períodes) — REPLACE ---------- */
const handleImportCSV: React.ChangeEventHandler<HTMLInputElement> = (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  Papa.parse(f, {
    header: true,
    skipEmptyLines: true,
    complete: (res: Papa.ParseResult<any>) => {
      try {
        const rows = (res.data as any[]).filter(Boolean);

        const {
          subjects: uniqueSubjects,
          periods: list,
          slotsPerPeriod: slotsMap,
          allowedPeriodsBySubject: nextAllowed,
        } = importSubjectsReplace(rows);

        setSubjects(uniqueSubjects);

        if (list.length > 0) {
          setPeriods(list);
          setSlotsPerPeriod(slotsMap);
          setAssignedPerPeriod({});
          setRoomsData({});
          setAllowedPeriodsBySubject(nextAllowed);
          setHiddenSubjectIds([]);
          setActivePid(list[0].id);
          alert(
            `Importades ${uniqueSubjects.length} assignatures i ${list.length} períodes del CSV.`
          );
        } else {
          setAllowedPeriodsBySubject(nextAllowed);
          setHiddenSubjectIds([]);
          alert(
            `Importades ${uniqueSubjects.length} assignatures del CSV.`
          );
        }
      } catch (err) {
        console.error(err);
        alert("Error processant el CSV");
      }
    },
    error: () => alert("No s'ha pogut llegir el fitxer CSV"),
  });

  e.currentTarget.value = "";
};
  

/* ---------- Import CSV (assignatures + períodes) — MERGE ---------- */
const handleMergeSubjectsCSV: React.ChangeEventHandler<HTMLInputElement> = (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  Papa.parse(f, {
    header: true,
    skipEmptyLines: true,
    complete: (res: Papa.ParseResult<any>) => {
      try {
        const rows = (res.data as any[]).filter(Boolean);

        const {
          nextSubjects,
          nextPeriods,
          nextAllowed,
          nextSlotsPerPeriod,
          addedSubjects,
          updatedSubjects,
          addedPeriods,
        } = importSubjectsMerge(rows, {
          subjects,
          periods,
          allowedPeriodsBySubject,
          slotsPerPeriod,
        });

        setSubjects(nextSubjects);
        setAllowedPeriodsBySubject(nextAllowed);
        setPeriods(nextPeriods);
        setSlotsPerPeriod(nextSlotsPerPeriod);

        alert(
          `Afegides ${addedSubjects} assignatures (actualitzades ${updatedSubjects}). Nous períodes: ${addedPeriods}.`
        );
      } catch (err) {
        console.error(err);
        alert("Error processant el CSV (merge).");
      }
    },
    error: () => alert("No s'ha pogut llegir el fitxer CSV (merge)"),
  });

  e.currentTarget.value = "";
};

  /* ---------- Import CSV (Aules + Matriculats) ---------- */
function handleImportRoomsCSV(ev: React.ChangeEvent<HTMLInputElement>) {
  const file = ev.target.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: "greedy",
    complete: (res: Papa.ParseResult<any>) => {
      try {
        const rows = (res.data as any[]).filter(Boolean);

        const { nextRooms, attached, skipped } = importRooms(rows, {
          subjects,
          periods,
          roomsData,
          slotsPerPeriod,
        });

        setRoomsData(nextRooms);
        alert(
          `Aules/Matrículats processats. Afegits: ${attached}. Omesos: ${skipped}.`
        );
      } catch (err) {
        console.error(err);
        alert("Error processant el CSV d’aules/matriculats");
      } finally {
        ev.target.value = "";
      }
    },
    error: () => {
      alert("No s'ha pogut llegir el fitxer CSV d’aules/matriculats");
      ev.target.value = "";
    },
  });
}


  /* ---------- Render ---------- */
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Planificador d'exàmens — períodes amb curs/quadrimestre
      </h1>
      <p className="text-sm mb-6">
        CSV esperat (assignatures/períodes):{" "}
        <code>
          codi,sigles,nivell,curs,quadrimestre,period_id,period_tipus,period_inici,period_fi,period_slots,period_blackouts
        </code>
        . Opcional: <code>MET,MATT,MEE,MCYBERS</code>.
      </p>

      <PlannerToolbar
        availableSubjects={availableSubjects}
        subjects={subjects}
        lastDeleted={lastDeleted}
        undoDelete={undoDelete}
        setLastDeleted={setLastDeleted}
        periods={periods}
        activePid={activePid}
        setActivePid={setActivePid}
        addPeriod={addPeriod}
        removePeriod={removePeriod}
        handleImportCSV={handleImportCSV}
        handleMergeSubjectsCSV={handleMergeSubjectsCSV}
        handleImportRoomsCSV={handleImportRoomsCSV}
        exportCSV={handleExportCSV}
        exportTXT={handleExportTXT}
        exportExcel={handleExportExcel}
        exportWord={handleExportWord}
        exportJSON={handleExportJSON}        
        importJSON={importJSON}
        saveStateToUrl={saveStateToUrl}
        loadStateFromUrl={loadStateFromUrl}
        copyLinkToClipboard={copyLinkToClipboard}
      />
      

      {/* Configuració del període actiu (resum) */}
      {activePeriod && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl border shadow-sm bg-white">
            <h2 className="font-semibold mb-3">
              Configuració del període
            </h2>

            <label className="block text-sm mb-1">Tipus</label>
            <select
              value={activePeriod.tipus}
              onChange={(e) => {
                const v = e.target.value as TipusPeriode;
                setPeriods((arr) =>
                  arr.map((p) =>
                    p.id === activePid ? { ...p, tipus: v } : p
                  )
                );
              }}
              className="w-full border rounded-xl p-2"
            >
              <option>PARCIAL</option>
              <option>FINAL</option>
              <option>REAVALUACIÓ</option>
            </select>

            <label className="block text-sm mt-3 mb-1">
              Curs (any d’inici)
            </label>
            <input
              type="number"
              placeholder="Ex. 2025"
              value={activePeriod.curs ?? ""}
              onChange={(e) => {
                const n = e.target.value
                  ? Number(e.target.value)
                  : undefined;
                setPeriods((arr) =>
                  arr.map((p) =>
                    p.id === activePid ? { ...p, curs: n } : p
                  )
                );
              }}
              className="w-full border rounded-xl p-2"
            />

            <label className="block text-sm mt-3 mb-1">
              Quadrimestre del període
            </label>
            <select
              value={activePeriod.quad ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value) as 0 | 1 | 2;
                setPeriods((arr) =>
                  arr.map((p) =>
                    p.id === activePid
                      ? {
                          ...p,
                          quad:
                            v === 1 || v === 2
                              ? (v as 1 | 2)
                              : undefined,
                        }
                      : p
                  )
                );
              }}
              className="w-full border rounded-xl p-2"
            >
              <option value={0}>(Sense)</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>

          {/* Franges horàries */}
          <div className="p-4 rounded-2xl border shadow-sm bg-white md:col-span-2">
            <h2 className="font-semibold mb-3">
              Franges horàries (per a aquest període)
            </h2>
            <div className="space-y-2">
              {(slotsPerPeriod[activePid] ?? []).map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm w-6">{i + 1}.</span>
                  <input
                    value={s.start}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSlotsPerPeriod((sp) => {
                        const arr = [...(sp[activePid] ?? [])];
                        arr[i] = { ...arr[i], start: v };
                        return { ...sp, [activePid]: arr };
                      });
                    }}
                    className="border rounded-xl p-2 w-28"
                    placeholder="HH:mm"
                  />
                  <span>–</span>
                  <input
                    value={s.end}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSlotsPerPeriod((sp) => {
                        const arr = [...(sp[activePid] ?? [])];
                        arr[i] = { ...arr[i], end: v };
                        return { ...sp, [activePid]: arr };
                      });
                    }}
                    className="border rounded-xl p-2 w-28"
                    placeholder="HH:mm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Safata + Calendari */}
      <DndContext
        onDragEnd={onDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
  <SubjectsTray
    availableSubjects={availableSubjects}
    subjects={subjects}
    hiddenSubjectIds={hiddenSubjectIds}
    setHiddenSubjectIds={setHiddenSubjectIds}
  />

        {/* Calendari del període actiu */}
        {activePeriod && (
          <ExamCalendarGrid
            activePeriod={activePeriod}
            activePid={activePid}
            slotsPerPeriod={slotsPerPeriod}
            assignedPerPeriod={assignedPerPeriod}
            subjects={subjects}
            roomsData={roomsData}
            removeOneFromCell={removeOneFromCell}
          />
        )}

        <TrashBin />
      </DndContext>
    </div>
  );
}
