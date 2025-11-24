// src/components/DropCell.tsx
import { useDroppable } from "@dnd-kit/core";
import type { Subject, RoomsEnroll } from "../types/examPlanner";
import { PlacedChip } from "./PlacedChip";

type DropCellProps = {
  id: string;
  disabled?: boolean;
  assignedList?: Subject[];
  extrasForSubjects?: Record<string, RoomsEnroll>;
  onRemoveOne?: (subjectId: string) => void;
  pid: number;
  dateIso: string;
  slotIndex: number;
};

export function DropCell({
  id,
  disabled,
  assignedList,
  extrasForSubjects,
  onRemoveOne,
  pid,
  dateIso,
  slotIndex,
}: DropCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <td
      ref={setNodeRef}
      className={`align-top min-w-[170px] h-20 p-2 border ${
        disabled
          ? "bg-gray-100 text-gray-400"
          : isOver
          ? "ring-2 ring-indigo-400"
          : "bg-white"
      }`}
    >
      {assignedList && assignedList.length ? (
        <div className="space-y-2">
          {assignedList.map((s) => {
            const extra = extrasForSubjects?.[s.id];

            return (
              <div key={s.id} className="relative">
                {/* Capseta arrossegable entre cel·les, AMB aules/estudiants a dins */}
                <PlacedChip
                  pid={pid}
                  dateIso={dateIso}
                  slotIndex={slotIndex}
                  s={s}
                  extra={extra}
                />

                {!disabled && onRemoveOne && (
                  <button
                    onClick={() => onRemoveOne(s.id)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full border bg-white shadow text-xs"
                    aria-label="Eliminar"
                    title="Eliminar d’aquesta cel·la"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic">
          {disabled ? "No disponible" : "Arrossega aquí"}
        </div>
      )}
    </td>
  );
}
