import { Eye, EyeOff } from "lucide-react";

interface Props {
  headless: boolean;
  onChange: (headless: boolean) => void;
  disabled?: boolean;
}

export function BrowserModeToggle({ headless, onChange, disabled }: Props) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Browser mode</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!headless)}
        className={`mt-1.5 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
          headless
            ? "border border-slate-700 text-slate-300 hover:text-white"
            : "bg-amber-500/20 text-amber-400"
        }`}
      >
        {headless ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        {headless ? "Headless" : "Headed"}
      </button>
    </div>
  );
}
