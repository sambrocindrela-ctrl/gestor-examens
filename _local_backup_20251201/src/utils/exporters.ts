// src/utils/exporters.ts
import * as XLSX from "xlsx";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
} from "docx";
import {
    format,
    addDays,
    subDays,
    isBefore,
    isAfter,
    startOfDay,
    parseISO,
} from "date-fns";

import type {
    Period,
    Subject,
    SlotsPerPeriod,
    AssignedPerPeriod,
    RoomsDataPerPeriod,
    RoomsMapPerCell,
    RoomsEnroll,
} from "../types/examPlanner";

/* Helpers de dates, iguals que al component */

function mondayOfWeek(d: Date) {
    const day = d.getDay(); // 0=dg … 6=ds
    const diff = (day + 6) % 7; // 0 si dilluns
    return startOfDay(subDays(d, diff));
}

function fridayOfWeek(d: Date) {
    const mon = mondayOfWeek(d);
    return startOfDay(addDays(mon, 4));
}

function* eachWeek(mondayStart: Date, fridayEnd: Date) {
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

/* Inferència (per si falta curs/quad) */

function inferCursFromDate(d: Date): string {
    const y = d.getFullYear(),
        m = d.getMonth() + 1;
    return (m >= 9 ? y : y - 1).toString(); // curs = any d'inici
}

function inferQuadFromDate(d: Date): 1 | 2 {
    const m = d.getMonth() + 1;
    return m >= 9 || m === 1 ? 1 : 2; // set–gen: Q1; feb–jul: Q2
}

/* ---------- JSON ---------- */

export function exportPlannerJSON(args: {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    subjects: Subject[];
    roomsData: RoomsDataPerPeriod;
    allowedPeriodsBySubject: Record<string, number[]>;
    hiddenSubjectIds: string[];
}) {
    const {
        periods,
        slotsPerPeriod,
        assignedPerPeriod,
        subjects,
        roomsData,
        allowedPeriodsBySubject,
        hiddenSubjectIds,
    } = args;

    const data = {
        periods,
        slotsPerPeriod,
        assignedPerPeriod,
        subjects,
        roomsData,
        allowedPeriodsBySubject,
        hiddenSubjectIds,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "planificador-examens.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ---------- CSV ---------- */

export function exportPlannerCSV(args: {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    subjects: Subject[];
}) {
    const { periods, slotsPerPeriod, assignedPerPeriod, subjects } = args;

    const lines: string[] = [];
    for (const p of periods) {
        const slots = slotsPerPeriod[p.id] ?? [];
        const amap = assignedPerPeriod[p.id] ?? {};
        for (const { mon } of eachWeek(
            mondayOfWeek(parseISO(p.startStr)),
            fridayOfWeek(parseISO(p.endStr))
        )) {
            for (let i = 0; i < 5; i++) {
                const day = addDays(mon, i);
                if (isDisabledDay(day, p)) continue;
                const dateIso = iso(day);
                for (let si = 0; si < slots.length; si++) {
                    const key = `${dateIso}|${si}`;
                    const ids = amap[key] ?? [];
                    if (!ids.length) continue;
                    for (const id of ids) {
                        const s = subjects.find((x) => x.id === id);
                        if (!s) continue;
                        const CENTRE = "230";
                        const CURS =
                            s.curs?.toString() ??
                            String(p.curs ?? inferCursFromDate(day));
                        const QUADRIMESTRE = String(
                            s.quadrimestre ?? p.quad ?? inferQuadFromDate(day)
                        );
                        const TIPUS_EXAMEN =
                            p.tipus === "REAVALUACIÓ" ? "REAVALUACIO" : p.tipus;
                        const DIA = format(day, "dd-MM-yyyy");
                        const HORA_INICI = slots[si].start;
                        const HORA_FI = slots[si].end;
                        const UNITAT_DOCENT = s.codi;
                        const GRUPS = "";
                        lines.push(
                            [
                                CENTRE,
                                CURS,
                                QUADRIMESTRE,
                                TIPUS_EXAMEN,
                                DIA,
                                HORA_INICI,
                                HORA_FI,
                                UNITAT_DOCENT,
                                GRUPS,
                            ].join(",")
                        );
                    }
                }
            }
        }
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "examens_export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ---------- Helpers per Excel/Word ---------- */

function formatSubjectForCell(s: Subject, extra?: RoomsEnroll): string {
    const lines: string[] = [];

    lines.push(`${s.codi} · ${s.sigles}`);

    const extraLines: string[] = [];
    if (s.nivell) extraLines.push(s.nivell);
    if (s.MET) extraLines.push(s.MET);
    if (s.MATT) extraLines.push(s.MATT);
    if (s.MEE) extraLines.push(s.MEE);
    if (s.MCYBERS) extraLines.push(s.MCYBERS);
    if (extraLines.length) lines.push(extraLines.join(" · "));

    if (extra) {
        const hasRooms = extra.rooms && extra.rooms.length > 0;
        const hasStud =
            typeof extra.students === "number" && Number.isFinite(extra.students);

        if (hasRooms || hasStud) {
            if (hasRooms) {
                lines.push(`Aules/Rooms: ${extra.rooms.join(", ")}`);
            }
            if (hasStud) {
                lines.push(`Estudiants/Students: ${extra.students}`);
            }
        }
    }

    return lines.join("\n");
}

function buildSubjectParagraphsForWord(
    s: Subject,
    extra?: RoomsEnroll
): Paragraph[] {
    const paras: Paragraph[] = [];

    paras.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `${s.codi} · ${s.sigles}`,
                    bold: true,
                }),
            ],
        })
    );

    if (s.nivell) {
        paras.push(
            new Paragraph({
                children: [new TextRun({ text: `Nivell: ${s.nivell}` })],
            })
        );
    }

    if (s.MATT) {
        paras.push(
            new Paragraph({
                children: [new TextRun({ text: s.MATT, color: "0000FF" })],
            })
        );
    }

    if (s.MET) {
        paras.push(
            new Paragraph({
                children: [new TextRun({ text: s.MET })],
            })
        );
    }

    if (s.MCYBERS) {
        paras.push(
            new Paragraph({
                children: [new TextRun({ text: s.MCYBERS, color: "008000" })],
            })
        );
    }

    if (s.MEE) {
        paras.push(
            new Paragraph({
                children: [new TextRun({ text: s.MEE, color: "FF0000" })],
            })
        );
    }

    if (extra?.rooms && extra.rooms.length > 0) {
        paras.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Aules/Rooms: ", bold: true }),
                    new TextRun({ text: extra.rooms.join(", ") }),
                ],
            })
        );
    }

    if (
        extra &&
        typeof extra.students === "number" &&
        Number.isFinite(extra.students)
    ) {
        paras.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Estudiants/Students: ", bold: true }),
                    new TextRun({ text: String(extra.students) }),
                ],
            })
        );
    }

    return paras;
}

/* ---------- Excel ---------- */

export function exportPlannerExcel(args: {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    subjects: Subject[];
    roomsData: RoomsDataPerPeriod;
}) {
    const { periods, slotsPerPeriod, assignedPerPeriod, subjects, roomsData } =
        args;

    try {
        const wb = XLSX.utils.book_new();

        const slotColors = ["E3F2FD", "E8F5E9", "FFF3E0", "F3E5F5", "E0F7FA", "FBE9E7"];
        const dayLabelsCat = ["Dl", "Dt", "Dc", "Dj", "Dv"];
        const dayLabelsEn = ["Mon", "Tue", "Wed", "Thu", "Fri"];

        for (const p of periods) {
            const slots = slotsPerPeriod[p.id] ?? [];
            if (!slots.length) continue;

            const amap = assignedPerPeriod[p.id] ?? {};
            const roomsForPeriod = roomsData[p.id] ?? {};
            const rows: any[][] = [];
            const slotIndexPerRow: number[] = [];

            const start = mondayOfWeek(parseISO(p.startStr));
            const end = fridayOfWeek(parseISO(p.endStr));
            let weekStart = start;

            while (weekStart <= end) {
                if (rows.length > 0) {
                    rows.push([]);
                    slotIndexPerRow.push(-1);
                }

                const headerWeek: any[] = ["Franja horària / Time slot"];
                for (let di = 0; di < 5; di++) {
                    const day = addDays(weekStart, di);
                    headerWeek.push(
                        `${dayLabelsCat[di]}/${dayLabelsEn[di]} ${format(day, "dd/MM")}`
                    );
                }
                rows.push(headerWeek);
                slotIndexPerRow.push(-1);

                slots.forEach((slot, si) => {
                    const row: any[] = [`${slot.start}-${slot.end}`];

                    for (let di = 0; di < 5; di++) {
                        const day = addDays(weekStart, di);
                        if (isDisabledDay(day, p)) {
                            row.push("");
                            continue;
                        }
                        const dateIso = format(day, "yyyy-MM-dd");
                        const key = `${dateIso}|${si}`;
                        const ids = amap[key] ?? [];
                        const list = ids
                            .map((id) => subjects.find((s) => s.id === id))
                            .filter(Boolean) as Subject[];

                        const roomsMap: RoomsMapPerCell = roomsForPeriod[key] ?? {};
                        const cellText = list
                            .map((s) => formatSubjectForCell(s, roomsMap[s.id]))
                            .join("\n\n");
                        row.push(cellText);
                    }

                    rows.push(row);
                    slotIndexPerRow.push(si);
                });

                weekStart = addDays(weekStart, 7);
            }

            const ws = XLSX.utils.aoa_to_sheet(rows);
            const range = XLSX.utils.decode_range(ws["!ref"] as string);

            const cols: any[] = [{ wch: 20 }];
            for (let i = 0; i < 5; i++) cols.push({ wch: 40 });
            (ws as any)["!cols"] = cols;
            (ws as any)["!rows"] = rows.map(() => ({ hpt: 36 }));

            for (let r = 0; r <= range.e.r; r++) {
                if (slotIndexPerRow[r] !== -1) continue;
                const first = rows[r]?.[0];
                if (first !== "Franja horària / Time slot") continue;
                for (let c = 0; c <= 5; c++) {
                    const addr = XLSX.utils.encode_cell({ r, c });
                    const cell = (ws as any)[addr];
                    if (!cell) continue;
                    cell.s = {
                        font: { bold: true },
                        alignment: { horizontal: "center" },
                        fill: { fgColor: { rgb: "E0E0E0" } },
                    };
                }
            }

            for (let r = 0; r <= range.e.r; r++) {
                const si = slotIndexPerRow[r];
                if (si < 0) continue;
                const color = slotColors[si % slotColors.length];
                for (let c = 1; c <= 5; c++) {
                    const addr = XLSX.utils.encode_cell({ r, c });
                    const cell = (ws as any)[addr];
                    if (!cell) continue;
                    const existing = cell.s ?? {};
                    cell.s = {
                        ...existing,
                        alignment: {
                            vertical: "top",
                            wrapText: true,
                            ...(existing.alignment || {}),
                        },
                        fill: { fgColor: { rgb: color } },
                    };
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, `${p.tipus}_id${p.id}`);
        }

        const wbout = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array",
        });
        const blob = new Blob([wbout], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "calendari_examens.xlsx";
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (err) {
        console.error("Error exportant l'Excel", err);
        alert(
            "No s'ha pogut exportar l'Excel. Revisa la consola del navegador per a més detalls."
        );
    }
}

/* ---------- Word ---------- */

export async function exportPlannerWord(args: {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    subjects: Subject[];
    roomsData: RoomsDataPerPeriod;
}) {
    const { periods, slotsPerPeriod, assignedPerPeriod, subjects, roomsData } =
        args;

    try {
        const dayLabelsCat = ["Dl", "Dt", "Dc", "Dj", "Dv"];
        const dayLabelsEn = ["Mon", "Tue", "Wed", "Thu", "Fri"];

        const sectionChildren: (Paragraph | Table)[] = [];

        for (const p of periods) {
            const slots = slotsPerPeriod[p.id] ?? [];
            if (!slots.length) continue;

            const amap = assignedPerPeriod[p.id] ?? {};
            const roomsForPeriod = roomsData[p.id] ?? {};

            sectionChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${p.label} — ${p.tipus}`,
                            bold: true,
                            size: 28,
                        }),
                    ],
                    spacing: { before: 200, after: 200 },
                })
            );

            const start = mondayOfWeek(parseISO(p.startStr));
            const end = fridayOfWeek(parseISO(p.endStr));
            let weekStart = start;

            while (weekStart <= end) {
                sectionChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Setmana ${fmtDM(weekStart)} — ${fmtDM(
                                    addDays(weekStart, 4)
                                )}`,
                                bold: true,
                            }),
                        ],
                        spacing: { before: 200, after: 100 },
                    })
                );

                const rows: TableRow[] = [];

                const headerCells: TableCell[] = [];
                headerCells.push(
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "Franja horària / Time slot",
                                        bold: true,
                                    }),
                                ],
                            }),
                        ],
                    })
                );

                for (let di = 0; di < 5; di++) {
                    const day = addDays(weekStart, di);
                    const label = `${dayLabelsCat[di]}/${dayLabelsEn[di]} ${fmtDM(day)}`;
                    headerCells.push(
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: label, bold: true })],
                                }),
                            ],
                        })
                    );
                }

                rows.push(new TableRow({ children: headerCells }));

                slots.forEach((slot, si) => {
                    const rowCells: TableCell[] = [];

                    rowCells.push(
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${slot.start}-${slot.end}`,
                                            bold: true,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    );

                    for (let di = 0; di < 5; di++) {
                        const day = addDays(weekStart, di);

                        if (isDisabledDay(day, p)) {
                            rowCells.push(
                                new TableCell({
                                    children: [new Paragraph({ text: "" })],
                                })
                            );
                            continue;
                        }

                        const dateIso = iso(day);
                        const key = `${dateIso}|${si}`;
                        const ids = amap[key] ?? [];
                        const list = ids
                            .map((id) => subjects.find((s) => s.id === id))
                            .filter(Boolean) as Subject[];

                        const extrasCell = roomsForPeriod[key] ?? {};

                        const cellParas: Paragraph[] = [];

                        list.forEach((s, idx) => {
                            const extra = extrasCell[s.id];
                            const subjectParas = buildSubjectParagraphsForWord(s, extra);
                            cellParas.push(...subjectParas);
                            if (idx < list.length - 1) {
                                cellParas.push(new Paragraph({ text: "" }));
                            }
                        });

                        if (!cellParas.length) {
                            cellParas.push(new Paragraph({ text: "" }));
                        }

                        rowCells.push(
                            new TableCell({
                                children: cellParas,
                            })
                        );
                    }

                    rows.push(new TableRow({ children: rowCells }));
                });

                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows,
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 2 },
                        bottom: { style: BorderStyle.SINGLE, size: 2 },
                        left: { style: BorderStyle.SINGLE, size: 2 },
                        right: { style: BorderStyle.SINGLE, size: 2 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                    },
                });

                sectionChildren.push(table);

                weekStart = addDays(weekStart, 7);
            }
        }

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: sectionChildren,
                },
            ],
        });

        const blob = await Packer.toBlob(doc);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "calendari_examens.docx";
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (err) {
        console.error("Error exportant el Word", err);
        alert(
            "No s'ha pogut exportar el Word. Revisa la consola del navegador per a més detalls."
        );
    }
}

/* ---------- TXT ---------- */

export function exportPlannerTXT(args: {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    subjects: Subject[];
}) {
    const { periods, slotsPerPeriod, assignedPerPeriod, subjects } = args;

    const LEN = {
        CODI: 10,
        CURS: 4,
        QUAD: 1,
        NOM: 120,
        DIA: 10,
        HORA: 5,
        DESC: 2000,
    } as const;

    const padText = (v: string, len: number) => {
        const s = (v ?? "").toString();
        return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
    };

    const padNum = (v: number | string | undefined, len: number) => {
        const s = (v ?? "").toString();
        return s.length >= len ? s.slice(0, len) : " ".repeat(len - s.length) + s;
    };

    const lines: string[] = [];
    for (const p of periods) {
        const slots = slotsPerPeriod[p.id] ?? [];
        const amap = assignedPerPeriod[p.id] ?? {};
        for (const { mon } of eachWeek(
            mondayOfWeek(parseISO(p.startStr)),
            fridayOfWeek(parseISO(p.endStr))
        )) {
            for (let i = 0; i < 5; i++) {
                const day = addDays(mon, i);
                if (isDisabledDay(day, p)) continue;
                for (let si = 0; si < slots.length; si++) {
                    const ids = amap[`${iso(day)}|${si}`] ?? [];
                    if (!ids.length) continue;
                    for (const id of ids) {
                        const s = subjects.find((x) => x.id === id);
                        if (!s) continue;

                        const CODI = padText(s.codi, LEN.CODI);
                        const CURS = padNum(
                            s.curs ?? String(p.curs ?? inferCursFromDate(day)),
                            LEN.CURS
                        );
                        const QUAD = padNum(
                            s.quadrimestre ?? p.quad ?? inferQuadFromDate(day),
                            LEN.QUAD
                        );
                        const NOM = padText(s.sigles, LEN.NOM);
                        const DIA = padText(format(day, "dd-MM-yyyy"), LEN.DIA);
                        const HORA = padText(
                            (slots[si].start || "").replace(":", "-"),
                            LEN.HORA
                        );
                        const DESC = padText(
                            p.tipus === "REAVALUACIÓ" ? "REAVALUACIO" : p.tipus,
                            LEN.DESC
                        );

                        lines.push([CODI, CURS, QUAD, NOM, DIA, HORA, DESC].join(" "));
                    }
                }
            }
        }
    }

    const txt = lines.join("\n");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "examens_export.txt";
    a.click();
    URL.revokeObjectURL(a.href);
}
