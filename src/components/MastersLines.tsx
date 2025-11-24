// src/components/MastersLines.tsx
import type { Subject } from "../types/examPlanner";

export function MastersLines({ s }: { s: Subject }) {
  const hasAny = s.MET || s.MATT || s.MEE || s.MCYBERS;
  if (!hasAny) return null;

  return (
    <div className="mt-1 text-[10px] leading-tight space-y-0.5">
      {/* MET neutre */}
      {s.MET && (
        <div className="text-gray-600">
          <span>{s.MET}</span>
        </div>
      )}

      {/* MATT en blau */}
      {s.MATT && (
        <div className="text-blue-700">
          <span>{s.MATT}</span>
        </div>
      )}

      {/* MEE en vermell */}
      {s.MEE && (
        <div className="text-red-700">
          <span>{s.MEE}</span>
        </div>
      )}

      {/* MCYBERS en verd */}
      {s.MCYBERS && (
        <div className="text-green-700">
          <span>{s.MCYBERS}</span>
        </div>
      )}
    </div>
  );
}
