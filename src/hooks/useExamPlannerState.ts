import { useState, useEffect } from "react";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { format } from "date-fns";

import type {
  Subject,
  Period,
  SlotsPerPeriod,
  AssignedPerPeriod,
  RoomsDataPerPeriod,
  RoomsEnroll,
} from "../types/examPlanner";

// Helpers locals perquè el hook pugui calcular dilluns/divendres de la setmana actual
function mondayOfWeek(d: Date) {
  const day = d.getDay();        // 0 = diumenge, 1 = dilluns, ...
  const diff = (day + 6) % 7;    // 0 si és dilluns
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

function fridayOfWeek(d: Date) {
  const mon = mondayOfWeek(d);
  const res = new Date(mon);
  res.setDate(mon.getDate() + 4); // divendres = dilluns + 4 dies
  res.setHours(0, 0, 0, 0);
  return res;
}

export function useExamPlannerState() {
  /* Assignatures (es sobreescriuran amb CSV/JSON) */
  const [subjects, setSubjects] = useState<Subject[]>([]);

  /* Períodes */
  const [periods, setPeriods] = useState<Period[]>([
    {
      id: 1,
      label: "Període 1",
      tipus: "PARCIAL",
      startStr: format(mondayOfWeek(new Date()), "yyyy-MM-dd"),
      endStr: format(fridayOfWeek(new Date()), "yyyy-MM-dd"),
      curs: undefined,
      quad: undefined,
      blackouts: [],
    },
  ]);

  /* Període actiu (per pintar) */
  const [activePid, setActivePid] = useState<number>(1);

  /* Franges per període */
  const [slotsPerPeriod, setSlotsPerPeriod] = useState<SlotsPerPeriod>({
    1: [
      { start: "08:00", end: "10:00" },
      { start: "10:30", end: "12:30" },
      { start: "15:00", end: "17:00" },
    ],
  });

  /* Assignacions per període */
  const [assignedPerPeriod, setAssignedPerPeriod] =
    useState<AssignedPerPeriod>({});

  /* Aules/Matriculats per període/cel·la/assignatura */
  const [roomsData, setRoomsData] = useState<RoomsDataPerPeriod>({});

  /* Períodes on cada assignatura està permesa (derivat del CSV d’import) */
  const [allowedPeriodsBySubject, setAllowedPeriodsBySubject] = useState<
    Record<string, number[]>
  >({});

  /* NOVETAT: llista d’ocultes (eliminades manualment de la safata) */
  const [hiddenSubjectIds, setHiddenSubjectIds] = useState<string[]>([]);

  /* --- Estat per Desfer l’eliminació definitiva --- */
  type DeletedSnapshot = {
    subject: Subject;
    allowedPeriods?: number[];
    placed: Record<number, string[]>; // pid -> llista de cellKeys on era present
    rooms: Record<number, Record<string, RoomsEnroll>>; // pid -> cellKey -> info
  };

  const [lastDeleted, setLastDeleted] = useState<DeletedSnapshot | null>(null);

  // Caducitat automàtica del banner "Desfer"
  useEffect(() => {
    if (!lastDeleted) return;
    const t = setTimeout(() => setLastDeleted(null), 20000); // 20 segons
    return () => clearTimeout(t);
  }, [lastDeleted]);

  // --- Guardar estat a l'URL ---
  function saveStateToUrl() {
    const payload = {
      subjects,
      periods,
      slotsPerPeriod,
      assignedPerPeriod,
      activePid,
      roomsData,
      allowedPeriodsBySubject,
      hiddenSubjectIds,
    };
    const packed = compressToEncodedURIComponent(JSON.stringify(payload));
    const url = new URL(window.location.href);
    url.hash = `state=${packed}`;
    history.replaceState(null, "", url.toString());
    alert("Estat guardat a l’enllaç!");
  }

  // --- Carregar estat des de l'URL ---
  function loadStateFromUrl(): boolean {
    const m = (window.location.hash || "").match(/[#&]state=([^&]+)/);
    if (!m) return false;
    try {
      const json = decompressFromEncodedURIComponent(m[1]);
      if (!json) return false;
      const data = JSON.parse(json);
      if (Array.isArray(data.subjects)) setSubjects(data.subjects);
      if (Array.isArray(data.periods)) setPeriods(data.periods);
      if (data.slotsPerPeriod) setSlotsPerPeriod(data.slotsPerPeriod);
      if (data.assignedPerPeriod) setAssignedPerPeriod(data.assignedPerPeriod);
      if (data.roomsData) setRoomsData(data.roomsData);
      if (data.allowedPeriodsBySubject)
        setAllowedPeriodsBySubject(data.allowedPeriodsBySubject);
      if (Array.isArray(data.hiddenSubjectIds))
        setHiddenSubjectIds(data.hiddenSubjectIds);
      if (typeof data.activePid === "number") setActivePid(data.activePid);
      return true;
    } catch {
      return false;
    }
  }

  // --- Copiar enllaç al portapapers ---
  function copyLinkToClipboard() {
    if (!window.location.hash.includes("state=")) {
      saveStateToUrl();
      return;
    }
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => alert("Enllaç copiat!"))
      .catch(() => alert("No s’ha pogut copiar l’enllaç."));
  }

  // Carregar estat automàticament en muntar
  useEffect(() => {
    loadStateFromUrl();
    // només un cop en muntar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
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
  };
}
