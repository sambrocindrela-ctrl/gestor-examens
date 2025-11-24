// src/components/TrayChip.tsx
import { useDraggable } from "@dnd-kit/core";
import type { Subject } from "../types/examPlanner";
import { MastersLines } from "./MastersLines";

export function TrayChip({ id, s }: { id: string; s: Subject }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`relative inline-flex flex-col px-3 py-2 rounded-2xl shadow-sm border text-sm select-none bg-white cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-70 ring-2 ring-indigo-300" : ""
      }`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        maxWidth: 300,
      }}
      title={`${s.sigles} · ${s.codi}`}
    >
      <span className="font-medium truncate">
        {s.sigles} · {s.codi}
      </span>
      {s.nivell ? (
        <span className="text-xs opacity-80 leading-4">
          Nivell: {s.nivell}
        </span>
      ) : (
        <MastersLines s={s} />
      )}
    </div>
  );
}