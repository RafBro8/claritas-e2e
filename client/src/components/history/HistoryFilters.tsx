import { Filter } from "lucide-react";
import type { Environment, RunStatus } from "../../types";

export type StatusFilter = "all" | RunStatus;
export type EnvironmentFilter = "all" | Environment;
export type TimeFilter = "all" | "today" | "7d" | "30d";

interface Props {
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  environment: EnvironmentFilter;
  onEnvironmentChange: (value: EnvironmentFilter) => void;
  time: TimeFilter;
  onTimeChange: (value: TimeFilter) => void;
}

const selectClass =
  "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none";

export function HistoryFilters({ status, onStatusChange, environment, onEnvironmentChange, time, onTimeChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="skipped">Skipped</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select
        value={environment}
        onChange={(e) => onEnvironmentChange(e.target.value as EnvironmentFilter)}
        className={selectClass}
        aria-label="Filter by environment"
      >
        <option value="all">All environments</option>
        <option value="local">Local</option>
        <option value="live">Live</option>
      </select>

      <select
        value={time}
        onChange={(e) => onTimeChange(e.target.value as TimeFilter)}
        className={selectClass}
        aria-label="Filter by time"
      >
        <option value="all">All time</option>
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </select>
    </div>
  );
}
