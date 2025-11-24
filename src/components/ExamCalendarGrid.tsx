// src/components/ExamCalendarGrid.tsx

import type {
  Period,
  SlotsPerPeriod,
  AssignedPerPeriod,
  Subject,
  RoomsDataPerPeriod,
  RoomsEnroll,
} from "../types/examPlanner";
import {
  addDays,
  subDays,
  startOfDay,
  isAfter,
  isBefore,
  parseISO,
  format,
} from "date-fns";
import { DropCell } from "./DropCell";

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

function cellKey(dateIso: string, slotIndex: number) {
  return `${dateIso}|${slotIndex}`;
}

type ExamCalendarGridProps = {
  activePeriod: Period;
  activePid: number;
  slotsPerPeriod: SlotsPerPeriod;
  assignedPerPeriod: AssignedPerPeriod;
  subjects: Subject[];
  roomsData: RoomsDataPerPeriod;
  removeOneFromCell: (
    pid: number,
    dateIso: string,
    slotIndex: number,
    subjectId: string
  ) => void;
};

export function ExamCalendarGrid({
  activePeriod,
  activePid,
  slotsPerPeriod,
  assignedPerPeriod,
  subjects,
  roomsData,
  removeOneFromCell,
}: ExamCalendarGridProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-semibold">
          {activePeriod.tipus} —{" "}
          {format(parseISO(activePeriod.startStr), "dd/MM")} a{" "}
          {format(parseISO(activePeriod.endStr), "dd/MM")}
        </h3>
        <span className="text-sm text-gray-500">(dl–dv)</span>
      </div>

      {[...eachWeek(
        mondayOfWeek(parseISO(activePeriod.startStr)),
        fridayOfWeek(parseISO(activePeriod.endStr))
      )].map(({ mon, fri }, wIdx) => (
        <div key={wIdx} className="mt-6">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold">
              Setmana {format(mon, "dd/MM")} — {format(fri, "dd/MM")}
            </h4>
            <span className="text-xs text-gray-500">(dl–dv)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2 w-28 text-left">Franja</th>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th
                      key={i}
                      className="border p-2 min-w-[170px] text-left"
                    >
                      <div className="font-semibold">
                        {["Dl/Mon", "Dt/Tu", "Dc/Wed", "Dj/Thu", "Dv/Fri"][i]}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fmtDM(addDays(mon, i))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(slotsPerPeriod[activePid] ?? []).map((s, slotIndex) => (
                  <tr key={slotIndex}>
                    <td className="border p-2 align-top font-medium whitespace-nowrap">
                      {s.start}-{s.end}
                    </td>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const day = addDays(mon, i);
                      const dateIso = iso(day);
                      const disabled = isDisabledDay(day, activePeriod);
                      const amap = assignedPerPeriod[activePid] ?? {};
                      const subjIds =
                        amap[cellKey(dateIso, slotIndex)] ?? [];

                      const assignedList = subjIds
                        .map((id) => subjects.find((x) => x.id === id))
                        .filter(Boolean) as Subject[];

                      const extrasForSubjects: Record<string, RoomsEnroll> = {};
                      const extrasCell =
                        roomsData?.[activePid]?.[
                          cellKey(dateIso, slotIndex)
                        ] ?? {};
                      for (const sid of subjIds) {
                        if (extrasCell[sid])
                          extrasForSubjects[sid] = extrasCell[sid];
                      }

                      return (
                        <DropCell
                          key={i}
                          id={`cell:${activePid}:${dateIso}:${slotIndex}`}
                          disabled={disabled}
                          assignedList={assignedList}
                          extrasForSubjects={extrasForSubjects}
                          onRemoveOne={
                            assignedList.length
                              ? (subjectId) =>
                                  removeOneFromCell(
                                    activePid,
                                    dateIso,
                                    slotIndex,
                                    subjectId
                                  )
                              : undefined
                          }
                          pid={activePid}
                          dateIso={dateIso}
                          slotIndex={slotIndex}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

