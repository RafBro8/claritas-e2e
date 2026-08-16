import { useCallback, useEffect, useMemo, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { getHistory, type HistoryStats } from "../api/history";
import { ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { StatTiles } from "../components/history/StatTiles";
import { HistoryFilters, type EnvironmentFilter, type StatusFilter, type TimeFilter } from "../components/history/HistoryFilters";
import { RunsTable } from "../components/history/RunsTable";
import type { RunRecord } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

function withinTimeFilter(startedAt: string, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const age = Date.now() - new Date(startedAt).getTime();
  if (filter === "today") return age <= DAY_MS;
  if (filter === "7d") return age <= 7 * DAY_MS;
  return age <= 30 * DAY_MS;
}

export function HistoryPage() {
  const { showToast } = useToast();

  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>({ total: 0, passed: 0, failed: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getHistory();
      setRuns(res.runs);
      setStats(res.stats);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't load run history", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        if (statusFilter !== "all" && run.status !== statusFilter) return false;
        if (environmentFilter !== "all" && run.environment !== environmentFilter) return false;
        if (!withinTimeFilter(run.startedAt, timeFilter)) return false;
        return true;
      }),
    [runs, statusFilter, environmentFilter, timeFilter],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-950 p-2">
            <History className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Run History</h1>
            <p className="text-sm text-slate-400">Past test runs, results, and durations.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <StatTiles stats={stats} />

      {stats.total === 0 && !isLoading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-8 text-center text-sm text-slate-500">
          No runs yet. Head to the Dashboard to run your first spec.
        </p>
      ) : (
        <>
          <HistoryFilters
            status={statusFilter}
            onStatusChange={setStatusFilter}
            environment={environmentFilter}
            onEnvironmentChange={setEnvironmentFilter}
            time={timeFilter}
            onTimeChange={setTimeFilter}
          />

          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
            <History className="h-4 w-4 text-blue-400" aria-hidden="true" />
            Recent Runs ({filteredRuns.length})
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <RunsTable runs={filteredRuns} />
          )}
        </>
      )}
    </div>
  );
}
