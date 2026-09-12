import { CalendarClock, Clock, FlaskConical, Mail, Pencil, Play, Trash2 } from "lucide-react";
import { API_ORIGIN } from "../../api/client";
import { StatusBadge } from "../StatusBadge";
import { formatRelativeOrDate } from "../../lib/format";
import type { ScheduleRecord } from "../../types";

interface Props {
  schedule: ScheduleRecord;
  busy: boolean;
  onToggleEnabled: (schedule: ScheduleRecord, enabled: boolean) => void;
  onRunNow: (schedule: ScheduleRecord) => void;
  onEdit: (schedule: ScheduleRecord) => void;
  onDelete: (schedule: ScheduleRecord) => void;
}

function formatNextRun(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function specsLabel(schedule: ScheduleRecord): string {
  if (schedule.specSelection.mode === "all") return "All specs";
  const count = schedule.specSelection.specIds.length;
  return `${count} spec${count === 1 ? "" : "s"}`;
}

const iconButtonClass = "rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40";

export function ScheduleRow({ schedule, busy, onToggleEnabled, onRunNow, onEdit, onDelete }: Props) {
  const { lastRun, lastEmail } = schedule;

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <label className="flex items-center pt-0.5" title={schedule.enabled ? "Pause this schedule" : "Resume this schedule"}>
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => onToggleEnabled(schedule, e.target.checked)}
            disabled={busy}
            aria-label={`${schedule.enabled ? "Pause" : "Resume"} ${schedule.name}`}
            className="h-4 w-4 accent-blue-600"
          />
        </label>

        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{schedule.name}</span>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
              {schedule.environment === "local" ? "Local" : "Live"}
            </span>
            {!schedule.enabled && (
              <span className="rounded-md bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-400">Paused</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              {schedule.description}
            </span>
            <span className="flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              {specsLabel(schedule)}
            </span>
            {schedule.emailTo && (
              <span className="flex items-center gap-1.5" title={`Report emailed to ${schedule.emailTo}`}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {schedule.emailTo}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Next: {schedule.nextRunAt ? formatNextRun(schedule.nextRunAt) : "Paused"}
            </span>
            {lastRun && (
              <span className="flex items-center gap-1.5">
                Last run: <StatusBadge status={lastRun.status} />
                <span className="text-slate-500">{formatRelativeOrDate(lastRun.startedAt)}</span>
                {lastRun.hasReport && (
                  <a
                    href={`${API_ORIGIN}/api/reports/${lastRun.runId}/html/index.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View report
                  </a>
                )}
              </span>
            )}
          </div>

          {lastEmail && lastEmail.status !== "sent" && schedule.emailTo && (
            <p className="text-xs text-amber-400">
              Last report email {lastEmail.status}
              {lastEmail.detail ? `: ${lastEmail.detail}` : ""}
            </p>
          )}
          {lastEmail?.status === "sent" && (
            <p className="text-xs text-slate-500">Last report emailed {formatRelativeOrDate(lastEmail.at)}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRunNow(schedule)}
            disabled={busy}
            aria-label={`Run ${schedule.name} now`}
            title="Run now"
            className={iconButtonClass}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(schedule)}
            disabled={busy}
            aria-label={`Edit ${schedule.name}`}
            title="Edit"
            className={iconButtonClass}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(schedule)}
            disabled={busy}
            aria-label={`Delete ${schedule.name}`}
            title="Delete"
            className={`${iconButtonClass} hover:text-red-400`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}
