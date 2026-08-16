import { API_ORIGIN } from "../../api/client";
import { StatusBadge } from "../StatusBadge";
import { formatDuration } from "../../lib/format";
import type { RunCompletedEvent } from "../../types";

interface Props {
  result: RunCompletedEvent;
}

export function RunResultSummary({ result }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
      <StatusBadge status={result.status} />
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
