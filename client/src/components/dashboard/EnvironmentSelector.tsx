import type { Environment } from "../../types";

interface Props {
  value: Environment;
  onChange: (env: Environment) => void;
  disabled?: boolean;
}

const OPTIONS: { value: Environment; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "live", label: "Live" },
];

export function EnvironmentSelector({ value, onChange, disabled }: Props) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environment</span>
      <div className="mt-1.5 inline-flex rounded-lg border border-slate-700 p-0.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              value === option.value ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
