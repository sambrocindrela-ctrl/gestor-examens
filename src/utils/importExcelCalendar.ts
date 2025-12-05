import * as XLSX from "xlsx-js-style";
import { parse, format, isValid } from "date-fns";
import type {
    Period,
    SlotsPerPeriod,
    AssignedPerPeriod,
    RoomsDataPerPeriod,
    Subject,
} from "../types/examPlanner";

export interface ImportedCalendarData {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    roomsData: RoomsDataPerPeriod;
    subjects: Subject[];
}

export async function importExcelCalendar(
    file: File,
    existingSubjects: Subject[]
): Promise<ImportedCalendarData> {
    console.log("!!! IMPORT EXCEL CALENDAR - MULTI-SUBJECT FIX (Step 1930) !!!");
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Clone existing subjects
                const allSubjects = [...existingSubjects];

                const result: ImportedCalendarData = {
                    periods: [],
                    slotsPerPeriod: {},
                    assignedPerPeriod: {},
                    roomsData: {},
                    subjects: allSubjects,
                };

                let currentPeriod: Period | null = null;
                let currentWeekDates: Date[] = [];
                let periodCounter = 1;
                let currentSlotIndex = -1; // Track active slot across rows (handling merged/split rows)

                // Helper to create or find subject
                // Now accepts a pre-cleaned name directly
                const resolveSubject = (code: string, name: string): string => {
                    const existing = allSubjects.find((s) => s.codi === code);
                    if (existing) return existing.id;

                    // Clean up name further if needed
                    let cleanedName = name
                        .replace(/\s+/g, " ")
                        .trim();

                    if (!cleanedName) cleanedName = `Assignatura ${code}`;

                    const newSub: Subject = {
                        id: crypto.randomUUID(),
                        codi: code,
                        sigles: cleanedName,
                        curs: "1",
                        quadrimestre: 1,
                    };
                    allSubjects.push(newSub);
                    // console.log(`[Import] Created subject: ${cleanedName} (${code})`);
                    return newSub.id;
                };

                // Helper to parse cell content for multiple subjects

                const metadataRegex = /Period(?:e)?\s*[:\s]\s*(.*?)[,;]\s*Curs\s*[:\s]\s*(.*?)[,;]\s*Q(?:uad(?:rimestre)?)?\s*[:\s]\s*(\d+)/i;
                const simpleMetadataRegex = /(PARCIAL(?:S)?|FINAL(?:S)?|REAVALUACIÓ(?:NS)?)[-\s]+(\d{4})[-\s]+(\d)/i;

                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length === 0) continue;

                    const firstCell = (row[0] || "").toString().trim();
                    const rowString = row.join(" ");

                    // 1. Check for Metadata Row -> New Period
                    let tipus: any = null;
                    let curs: number | null = null;
                    let quad: 1 | 2 | null = null;

                    const metaMatch = rowString.match(metadataRegex);
                    const simpleMatch = rowString.match(simpleMetadataRegex);

                    if (metaMatch) {
                        tipus = metaMatch[1].trim();
                        curs = parseInt(metaMatch[2].trim(), 10);
                        quad = parseInt(metaMatch[3].trim(), 10) as 1 | 2;
                    } else if (simpleMatch) {
                        let rawType = simpleMatch[1].toUpperCase();
                        if (rawType.startsWith("PARCIAL")) tipus = "PARCIAL";
                        else if (rawType.startsWith("FINAL")) tipus = "FINAL";
                        else if (rawType.startsWith("REAVALUACIÓ")) tipus = "REAVALUACIÓ";

                        curs = parseInt(simpleMatch[2], 10);
                        quad = parseInt(simpleMatch[3], 10) as 1 | 2;
                    }

                    if (tipus && curs && quad) {
                        const newPeriod: Period = {
                            id: periodCounter++,
                            label: `Period ${periodCounter - 1}`,
                            tipus: tipus,
                            curs: isNaN(curs) ? 2025 : curs,
                            quad: quad,
                            startStr: "",
                            endStr: "",
                            blackouts: [],
                        };
                        currentPeriod = newPeriod;
                        result.periods.push(newPeriod);
                        result.slotsPerPeriod[newPeriod.id] = [];
                        result.assignedPerPeriod[newPeriod.id] = {};
                        result.roomsData[newPeriod.id] = {};
                        currentSlotIndex = -1; // Reset slot
                        continue;
                    }

                    // 2. Check for Date Row
                    let validDatesInRow: { col: number; date: Date }[] = [];
                    for (let c = 1; c < row.length; c++) {
                        const cellVal = row[c];
                        if (typeof cellVal === "string" || typeof cellVal === "number") {
                            let date: Date | undefined;
                            if (typeof cellVal === "number") {
                                date = new Date(Math.round((cellVal - 25569) * 86400 * 1000));
                            } else {
                                const valStr = cellVal.trim();
                                const normalized = valStr.replace(/[.-]/g, "/");
                                const parts = normalized.split("/");
                                if (parts.length === 3) {
                                    const parsed = parse(normalized, "dd/MM/yyyy", new Date());
                                    if (isValid(parsed)) date = parsed;
                                }
                            }
                            if (date) validDatesInRow.push({ col: c, date });
                        }
                    }

                    if (validDatesInRow.length >= 2) {
                        currentWeekDates = new Array(row.length).fill(null);
                        validDatesInRow.forEach((item) => {
                            currentWeekDates[item.col] = item.date;
                        });

                        if (currentPeriod) {
                            const rowDates = validDatesInRow.map(d => d.date);
                            const minDate = new Date(Math.min(...rowDates.map(d => d.getTime())));
                            const maxDate = new Date(Math.max(...rowDates.map(d => d.getTime())));
                            if (!currentPeriod.startStr || minDate < new Date(currentPeriod.startStr)) currentPeriod.startStr = format(minDate, "yyyy-MM-dd");
                            if (!currentPeriod.endStr || maxDate > new Date(currentPeriod.endStr)) currentPeriod.endStr = format(maxDate, "yyyy-MM-dd");
                        }
                        currentSlotIndex = -1; // New week/dates implies reset slot
                        continue;
                    }

                    // 3. Check for Time Slot Row
                    let timeCell = firstCell;
                    let allTimes = timeCell.match(/(\d{1,2}[:.]\d{2})/g);
                    if ((!allTimes || allTimes.length < 2) && row.length > 1) {
                        // Check second col
                        const secondCell = (row[1] || "").toString().trim();
                        const secondTimes = secondCell.match(/(\d{1,2}[:.]\d{2})/g);
                        if (secondTimes && secondTimes.length >= 2) {
                            timeCell = secondCell;
                            allTimes = secondTimes;
                        }
                    }

                    if (allTimes && allTimes.length >= 2 && currentPeriod) {
                        // Found a NEW time slot definition
                        const start = allTimes[0].replace('.', ':');
                        const end = allTimes[1].replace('.', ':');

                        let slotIdx = result.slotsPerPeriod[currentPeriod.id].findIndex(
                            (s) => s.start === start && s.end === end
                        );
                        if (slotIdx === -1) {
                            result.slotsPerPeriod[currentPeriod.id].push({ start, end });
                            slotIdx = result.slotsPerPeriod[currentPeriod.id].length - 1;
                        }
                        currentSlotIndex = slotIdx;
                    } else {
                        // NO time slot found in this row. 
                        // If we have an active currentSlotIndex, we treat this row as part of that slot (merged/continuation).
                        // If currentSlotIndex is -1, we skip.
                    }

                    // 4. Process Subjects if we have a valid slot and period
                    if (currentPeriod && currentSlotIndex !== -1) {
                        // Iterate columns
                        for (let c = 1; c < row.length; c++) {
                            const cellContent = (row[c] || "").toString();
                            if (!cellContent.trim()) continue;

                            // Must correspond to a valid date
                            const date = currentWeekDates[c];
                            if (!date) continue;

                            const dateIso = format(date, "yyyy-MM-dd");
                            const key = `${dateIso}|${currentSlotIndex}`;

                            // Parse ANY subjects in this cell
                            const subjectsFound = parseCellSubjects(cellContent);

                            for (const subj of subjectsFound) {
                                const subjectId = resolveSubject(subj.code, subj.name);

                                if (!result.assignedPerPeriod[currentPeriod.id][key]) {
                                    result.assignedPerPeriod[currentPeriod.id][key] = [];
                                }
                                if (!result.assignedPerPeriod[currentPeriod.id][key].includes(subjectId)) {
                                    result.assignedPerPeriod[currentPeriod.id][key].push(subjectId);
                                }
                            }
                        }
                    }
                }

                console.log("[Import] Finished processing rows.");
                resolve(result);
            } catch (err) {
                console.error("[Import] Error:", err);
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
