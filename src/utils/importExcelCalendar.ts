import * as XLSX from "xlsx-js-style";
import { parse, format, isValid } from "date-fns";
import type {
    Period,
    SlotsPerPeriod,
    AssignedPerPeriod,
    RoomsDataPerPeriod,
    TimeSlot,
    Subject,
} from "../types/examPlanner";

export interface ImportedCalendarData {
    periods: Period[];
    slotsPerPeriod: SlotsPerPeriod;
    assignedPerPeriod: AssignedPerPeriod;
    roomsData: RoomsDataPerPeriod;
}

export async function importExcelCalendar(
    file: File,
    existingSubjects: Subject[]
): Promise<ImportedCalendarData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                const result: ImportedCalendarData = {
                    periods: [],
                    slotsPerPeriod: {},
                    assignedPerPeriod: {},
                    roomsData: {},
                };

                let currentPeriod: Period | null = null;
                let currentWeekDates: Date[] = [];
                let periodCounter = 1;

                // Helper to find subject by code (e.g. 230482)
                const findSubjectId = (text: string): string | undefined => {
                    const match = text.match(/230\d{3}/);
                    if (match) {
                        const code = match[0];
                        const sub = existingSubjects.find((s) => s.codi === code);
                        return sub ? sub.id : undefined;
                    }
                    return undefined;
                };

                // Regex for metadata row: "Period: [Tipus], Curs: [Curs], Q: [Quad]"
                // Allowing flexibility in separators and casing
                // Regex for metadata row: "Period: [Tipus], Curs: [Curs], Q: [Quad]"
                const metadataRegex = /Period(?:e)?\s*[:\s]\s*(.*?)[,;]\s*Curs\s*[:\s]\s*(.*?)[,;]\s*Q(?:uad(?:rimestre)?)?\s*[:\s]\s*(\d+)/i;
                // Regex for simple format: "PARCIALS-2025-1" or "FINALS 2025 2"
                const simpleMetadataRegex = /(PARCIAL(?:S)?|FINAL(?:S)?|REAVALUACIÓ(?:NS)?)[-\s]+(\d{4})[-\s]+(\d)/i;

                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length === 0) continue;

                    const firstCell = (row[0] || "").toString().trim();
                    const rowString = row.join(" ");

                    // 1. Check for Metadata Row (New Period)
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
                        // Create new period
                        const newPeriod: Period = {
                            id: periodCounter++,
                            label: `Period ${periodCounter - 1}`,
                            tipus: tipus,
                            curs: isNaN(curs) ? 2025 : curs,
                            quad: quad,
                            startStr: "", // Will be set when we find dates
                            endStr: "",
                            blackouts: [],
                        };
                        currentPeriod = newPeriod;
                        result.periods.push(newPeriod);
                        result.slotsPerPeriod[newPeriod.id] = [];
                        result.assignedPerPeriod[newPeriod.id] = {};
                        result.roomsData[newPeriod.id] = {};
                        continue;
                    }

                    // ... (Date Row check skipped for brevity in replacement if unchanged)

                    // 2. Check for Date Row (Week Header)
                    // Look for at least 2 valid dates in the row
                    let validDatesInRow: { col: number; date: Date }[] = [];
                    for (let c = 1; c < row.length; c++) {
                        const cellVal = row[c];
                        if (typeof cellVal === "string" || typeof cellVal === "number") {
                            // Try parsing dd/MM/yyyy
                            // Excel might return number (days since 1900) or string
                            let date: Date | undefined;
                            if (typeof cellVal === "number") {
                                // Excel date serial
                                date = new Date(Math.round((cellVal - 25569) * 86400 * 1000));
                            } else {
                                const parts = cellVal.trim().split("/");
                                if (parts.length === 3) {
                                    date = parse(cellVal.trim(), "dd/MM/yyyy", new Date());
                                }
                            }

                            if (date && isValid(date)) {
                                validDatesInRow.push({ col: c, date });
                            }
                        }
                    }

                    if (validDatesInRow.length >= 2) {
                        // Found a date row!
                        currentWeekDates = new Array(row.length).fill(null);
                        validDatesInRow.forEach((item) => {
                            currentWeekDates[item.col] = item.date;
                        });

                        // Update Period start/end if needed
                        if (currentPeriod) {
                            const rowDates = validDatesInRow.map(d => d.date);
                            const minDate = new Date(Math.min(...rowDates.map(d => d.getTime())));
                            const maxDate = new Date(Math.max(...rowDates.map(d => d.getTime())));

                            if (!currentPeriod.startStr || minDate < new Date(currentPeriod.startStr)) {
                                currentPeriod.startStr = format(minDate, "yyyy-MM-dd");
                            }
                            if (!currentPeriod.endStr || maxDate > new Date(currentPeriod.endStr)) {
                                currentPeriod.endStr = format(maxDate, "yyyy-MM-dd");
                            }
                        }
                        continue;
                    }

                    // 3. Check for Time Slot Row
                    // Regex for "HH:mm" or "HH:mm-HH:mm" or "HH:mm\nHH:mm"
                    const timeMatch = firstCell.match(/(\d{1,2}:\d{2})[\s\-\n]+(\d{1,2}:\d{2})/);
                    if (timeMatch && currentPeriod) {
                        const start = timeMatch[1];
                        const end = timeMatch[2];

                        // Check if slot already exists for this period
                        let slotIndex = result.slotsPerPeriod[currentPeriod.id].findIndex(
                            (s) => s.start === start && s.end === end
                        );

                        if (slotIndex === -1) {
                            // TimeSlot id is usually number in this project? Let's check types.
                            // In types/examPlanner.ts: interface TimeSlot { start: string; end: string; }
                            const newSlot: TimeSlot = { start, end };
                            result.slotsPerPeriod[currentPeriod.id].push(newSlot);
                            slotIndex = result.slotsPerPeriod[currentPeriod.id].length - 1;
                        }

                        // Process cells in this row for subjects
                        for (let c = 1; c < row.length; c++) {
                            const cellContent = (row[c] || "").toString();
                            if (!cellContent.trim()) continue;

                            const date = currentWeekDates[c];
                            if (!date) continue; // Should correspond to a date column

                            const dateIso = format(date, "yyyy-MM-dd");
                            const key = `${dateIso}|${slotIndex}`;

                            // Find Subject ID
                            const subjectId = findSubjectId(cellContent);
                            if (subjectId) {
                                // Add to assignedPerPeriod
                                if (!result.assignedPerPeriod[currentPeriod.id][key]) {
                                    result.assignedPerPeriod[currentPeriod.id][key] = [];
                                }
                                // assignedPerPeriod values are string[] (subject IDs as strings)?
                                // Let's check types. Subject.id is string.
                                if (!result.assignedPerPeriod[currentPeriod.id][key].includes(subjectId)) {
                                    result.assignedPerPeriod[currentPeriod.id][key].push(subjectId);
                                }

                                // Extract Rooms
                                const lines = cellContent.split(/\r?\n/);
                                const roomLines = lines.filter((l: string) => /Aula|Classroom/i.test(l));
                                if (roomLines.length > 0) {
                                    const roomsCleaned = roomLines.map((l: string) => l.replace(/Aula|Classroom/gi, "").trim());

                                    if (!result.roomsData[currentPeriod.id][key]) {
                                        result.roomsData[currentPeriod.id][key] = {};
                                    }
                                    result.roomsData[currentPeriod.id][key][subjectId] = {
                                        rooms: roomsCleaned,
                                        students: 0
                                    };
                                }
                            }
                        }
                    }
                }

                resolve(result);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
