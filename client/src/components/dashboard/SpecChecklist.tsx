import { FlaskConical } from "lucide-react";
import type { Spec } from "../../types";

interface Props {
  specs: Spec[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function SpecChecklist({ specs, isLoading, selectedIds, onToggle, onSelectAll, onClear, disabled }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
          <FlaskConical className="h-4 w-4 text-blue-400" aria-hidden="true" />
          Specs ({specs.length})
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || specs.length === 0}
            className="text-blue-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select all
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled || selectedIds.size === 0}
            className="text-slate-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Loading specs…</p>
      ) : specs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No specs found in the target suite.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {specs.map((spec) => (
            <li key={spec.id}>
              <label
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(spec.id)}
                  onChange={() => onToggle(spec.id)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-100">{spec.title}</span>
                <span className="ml-auto font-mono text-xs text-slate-500">{spec.fileName}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
