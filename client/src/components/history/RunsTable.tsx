import { API_ORIGIN } from "../../api/client";
import { StatusBadge } from "../StatusBadge";
import { formatDuration, formatRelativeOrDate } from "../../lib/format";
import type { RunRecord } from "../../types";

interface Props {
  runs: RunRecord[];
}

function specsLabel(specIds: string[]): string {
  if (specIds.length === 0) return "—";
  if (specIds.length === 1) return specIds[0];
  return `${specIds[0]} +${specIds.length - 1}`;
}

export function RunsTable({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-8 text-center text-sm text-slate-500">
        No runs match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Specs</th>
            <th className="px-4 py-2.5">Env</th>
            <th className="px-4 py-2.5">Duration</th>
            <th className="px-4 py-2.5">Started</th>
            <th className="px-4 py-2.5">Run ID</th>
            <th className="px-4 py-2.5">Report</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, index) => (
            <tr
              key={run.runId}
              className={`border-b border-slate-800/60 last:border-b-0 ${index % 2 === 1 ? "bg-slate-900/40" : ""}`}
            >
              <td className="px-4 py-2.5">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-2.5 text-slate-300" title={run.specIds.join(", ")}>
                {specsLabel(run.specIds)}
              </td>
              <td className="px-4 py-2.5 text-slate-400">{run.environment === "local" ? "Local" : "Live"}</td>
              <td className="px-4 py-2.5 text-slate-400">
                {run.durationMs !== undefined ? formatDuration(run.durationMs) : "—"}
              </td>
              <td className="px-4 py-2.5 text-slate-400">{formatRelativeOrDate(run.startedAt)}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{run.runId}</td>
              <td className="px-4 py-2.5">
                {run.hasReport ? (
                  <a
                    href={`${API_ORIGIN}/api/reports/${run.runId}/html/index.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View report
                  </a>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
