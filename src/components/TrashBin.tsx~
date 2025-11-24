// src/components/TrashBin.tsx
import { useDroppable } from "@dnd-kit/core";

export function TrashBin() {
  const { setNodeRef, isOver } = useDroppable({ id: "trash:catalog" });

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-md bg-white
        ${isOver ? "ring-2 ring-red-400 bg-red-50" : ""}`}
    >
      <span className="text-sm">🗑️ Paperera</span>
      <span className="text-xs text-gray-500">
        Arrossega aquí per eliminar del catàleg
      </span>
    </div>
  );
}