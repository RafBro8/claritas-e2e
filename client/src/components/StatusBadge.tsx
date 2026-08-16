import { CheckCircle2, Loader2, MinusCircle, SkipForward, XCircle } from "lucide-react";
import type { RunStatus } from "../types";

const STATUS_STYLES: Record<RunStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  passed: { label: "Passed", className: "text-emerald-400", icon: CheckCircle2 },
  failed: { label: "Failed", className: "text-red-400", icon: XCircle },
  skipped: { label: "Skipped", className: "text-amber-400", icon: SkipForward },
  cancelled: { label: "Cancelled", className: "text-slate-400", icon: MinusCircle },
  running: { label: "Running", className: "text-blue-400", icon: Loader2 },
};

interface Props {
  status: RunStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: Props) {
  const { label, className: colorClass, icon: Icon } = STATUS_STYLES[status];
  return (
    <span className={`flex items-center gap-1.5 font-semibold whitespace-nowrap ${colorClass} ${className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}
