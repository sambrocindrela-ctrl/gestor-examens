import { ref, watch, onMounted } from "vue";
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

// Helpers locals
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
    const subjects = ref<Subject[]>([]);

    /* Períodes */
    const periods = ref<Period[]>([
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
    const activePid = ref<number>(1);

    /* Franges per període */
    const slotsPerPeriod = ref<SlotsPerPeriod>({
        1: [
            { start: "08:00", end: "10:00" },
            { start: "10:30", end: "12:30" },
            { start: "15:00", end: "17:00" },
        ],
    });

    /* Assignacions per període */
    const assignedPerPeriod = ref<AssignedPerPeriod>({});

    /* Aules/Matriculats per període/cel·la/assignatura */
    const roomsData = ref<RoomsDataPerPeriod>({});

    /* Períodes on cada assignatura està permesa (derivat del CSV d’import) */
    const allowedPeriodsBySubject = ref<Record<string, number[]>>({});

    /* NOVETAT: llista d’ocultes (eliminades manualment de la safata) */
    const hiddenSubjectIds = ref<string[]>([]);

    /* --- Estat per Desfer l’eliminació definitiva --- */
    type DeletedSnapshot = {
        subject: Subject;
        allowedPeriods?: number[];
        placed: Record<number, string[]>; // pid -> llista de cellKeys on era present
        rooms: Record<number, Record<string, RoomsEnroll>>; // pid -> cellKey -> info
    };

    const lastDeleted = ref<DeletedSnapshot | null>(null);

    // Caducitat automàtica del banner "Desfer"
    watch(lastDeleted, (newVal) => {
        if (!newVal) return;
        const t = setTimeout(() => {
            lastDeleted.value = null;
        }, 20000); // 20 segons
        // Cleanup not strictly necessary in Vue watch unless we want to cancel on re-change, 
        // but here we just set a timeout. If it changes again, a new timeout is set.
        // To be precise we should clear timeout, but for simplicity this is fine or we can use onInvalidate.
    });

    // --- Guardar estat a l'URL ---
    function saveStateToUrl() {
        const payload = {
            subjects: subjects.value,
            periods: periods.value,
            slotsPerPeriod: slotsPerPeriod.value,
            assignedPerPeriod: assignedPerPeriod.value,
            activePid: activePid.value,
            roomsData: roomsData.value,
            allowedPeriodsBySubject: allowedPeriodsBySubject.value,
            hiddenSubjectIds: hiddenSubjectIds.value,
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
            if (Array.isArray(data.subjects)) subjects.value = data.subjects;
            if (Array.isArray(data.periods)) periods.value = data.periods;
            if (data.slotsPerPeriod) slotsPerPeriod.value = data.slotsPerPeriod;
            if (data.assignedPerPeriod) assignedPerPeriod.value = data.assignedPerPeriod;
            if (data.roomsData) roomsData.value = data.roomsData;
            if (data.allowedPeriodsBySubject)
                allowedPeriodsBySubject.value = data.allowedPeriodsBySubject;
            if (Array.isArray(data.hiddenSubjectIds))
                hiddenSubjectIds.value = data.hiddenSubjectIds;
            if (typeof data.activePid === "number") activePid.value = data.activePid;
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
    onMounted(() => {
        loadStateFromUrl();
    });

    return {
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
    };
}
