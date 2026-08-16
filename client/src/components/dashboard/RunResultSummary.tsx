import { CheckCircle2, XCircle, MinusCircle, SkipForward } from "lucide-react";
import { API_ORIGIN } from "../../api/client";
import type { RunCompletedEvent, RunStatus } from "../../types";

interface Props {
  result: RunCompletedEvent;
}

const STATUS_STYLES: Record<RunStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  passed: { label: "Passed", className: "text-emerald-400", icon: CheckCircle2 },
  failed: { label: "Failed", className: "text-red-400", icon: XCircle },
  skipped: { label: "Skipped", className: "text-amber-400", icon: SkipForward },
  cancelled: { label: "Cancelled", className: "text-slate-400", icon: MinusCircle },
  running: { label: "Running", className: "text-blue-400", icon: CheckCircle2 },
};

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function RunResultSummary({ result }: Props) {
  const { label, className, icon: Icon } = STATUS_STYLES[result.status];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
      <span className={`flex items-center gap-1.5 font-semibold ${className}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      <span className="text-slate-400">
        {result.counts.passed} passed · {result.counts.failed} failed · {result.counts.skipped} skipped
        {result.counts.flaky > 0 ? ` · ${result.counts.flaky} flaky` : ""}
      </span>
      <span className="text-slate-500">{formatDuration(result.durationMs)}</span>
      {result.hasReport && (
        <a
          href={`${API_ORIGIN}/api/reports/${result.runId}/html/index.html`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-blue-400 hover:underline"
        >
          View report
        </a>
      )}
    </div>
  );
}
