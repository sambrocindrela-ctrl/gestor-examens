// src/components/SubjectsTray.tsx
import type { Dispatch, SetStateAction } from "react";
import type { Subject } from "../types/examPlanner";
import { TrayChip } from "./TrayChip";

interface SubjectsTrayProps {
  availableSubjects: Subject[];
  subjects: Subject[];
  hiddenSubjectIds: string[];
  setHiddenSubjectIds: Dispatch<SetStateAction<string[]>>;
}

export function SubjectsTray({
  availableSubjects,
  subjects,
  hiddenSubjectIds,
  setHiddenSubjectIds,
}: SubjectsTrayProps) {
  return (
    <>
      {/* Safata d'assignatures */}
      <div className="p-4 rounded-2xl border shadow-sm bg-white mb-3">
        <h2 className="font-semibold mb-3">Assignatures (arrossega)</h2>

        <div className="flex flex-wrap gap-2">
          {availableSubjects.map((s) => (
            <TrayChip key={s.id} id={s.id} s={s} />
          ))}

          {!availableSubjects.length && (
            <div className="text-xs text-gray-500 italic">
              No hi ha assignatures per al curs/quadrimestre i període
              d’aquest calendari, o ja estan totes
              programades/ocultes.
            </div>
          )}
        </div>
      </div>

      {/* Llista d'eliminades (amb restauració) */}
      {hiddenSubjectIds.length > 0 && (
        <div className="p-3 rounded-xl border shadow-sm bg-yellow-50 mb-6 text-sm">
          <div className="font-semibold mb-2">
            Assignatures eliminades de la safata
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenSubjectIds.map((id) => {
              const s = subjects.find((x) => x.id === id);
              if (!s) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border bg-white"
                >
                  {s.sigles || s.codi}
                  <button
                    className="text-xs px-2 py-0.5 border rounded-md"
                    onClick={() =>
                      setHiddenSubjectIds((prev) =>
                        prev.filter((x) => x !== id)
                      )
                    }
                    title="Restaurar a la safata"
                  >
                    Restaurar
                  </button>
                </span>
              );
            })}
            <button
              className="ml-2 text-xs px-2 py-0.5 border rounded-md bg-white"
              onClick={() => setHiddenSubjectIds([])}
              title="Restaurar totes"
            >
              Restaurar totes
            </button>
          </div>
        </div>
      )}
    </>
  );
}

