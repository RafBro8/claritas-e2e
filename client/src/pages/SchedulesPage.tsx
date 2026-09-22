import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Plus, RefreshCw } from "lucide-react";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  runScheduleNow,
  updateSchedule,
  type ScheduleInput,
} from "../api/schedules";
import { listSpecs } from "../api/specs";
import { ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { ScheduleDialog } from "../components/schedules/ScheduleDialog";
import { ScheduleRow } from "../components/schedules/ScheduleRow";
import type { ScheduleRecord, Spec } from "../types";

export function SchedulesPage() {
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // null = closed; { schedule: null } = creating; { schedule } = editing.
  const [dialog, setDialog] = useState<{ schedule: ScheduleRecord | null } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleRes, specRes] = await Promise.all([getSchedules(), listSpecs()]);
      setSchedules(scheduleRes.schedules);
      setEmailConfigured(scheduleRes.emailConfigured);
      setSpecs(specRes.specs);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't load schedules", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(input: ScheduleInput): Promise<void> {
    const editing = dialog?.schedule ?? null;
    const res = editing ? await updateSchedule(editing.id, input) : await createSchedule(input);

    setSchedules((prev) =>
      editing ? prev.map((s) => (s.id === res.schedule.id ? res.schedule : s)) : [res.schedule, ...prev],
    );
    setDialog(null);
    showToast(editing ? "Schedule updated" : "Schedule created", "success");
  }

  async function handleToggleEnabled(schedule: ScheduleRecord, enabled: boolean): Promise<void> {
    setBusyId(schedule.id);
    try {
      const res = await updateSchedule(schedule.id, { enabled });
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? res.schedule : s)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update this schedule", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRunNow(schedule: ScheduleRecord): Promise<void> {
    setBusyId(schedule.id);
    try {
      await runScheduleNow(schedule.id);
      showToast(`"${schedule.name}" started - watch it on the Dashboard`, "success");
      // The run is now in flight; reload so its "last run" shows as running.
      await load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't start this run", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(schedule: ScheduleRecord): Promise<void> {
    if (!window.confirm(`Delete "${schedule.name}"? This doesn't affect runs it already did.`)) return;

    setBusyId(schedule.id);
    try {
      await deleteSchedule(schedule.id);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      showToast("Schedule deleted", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't delete this schedule", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-950 p-2">
            <CalendarClock className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Scheduled Runs</h1>
            <p className="text-sm text-slate-400">Run specs automatically on a schedule and get the report emailed to you.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setDialog({ schedule: null })}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New schedule
          </button>
        </div>
      </div>

      {!emailConfigured && (
        <p className="rounded-lg border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
          Email isn't set up on the server yet, so report emails won't send. Schedules still run on time, and every run
          appears in Run History.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : schedules.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-300">No schedules yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create one to run specs automatically - nightly, hourly, or on a cron expression of your own.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {schedules.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              busy={busyId === schedule.id}
              onToggleEnabled={handleToggleEnabled}
              onRunNow={handleRunNow}
              onEdit={(s) => setDialog({ schedule: s })}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {dialog && (
        <ScheduleDialog
          schedule={dialog.schedule}
          specs={specs}
          emailConfigured={emailConfigured}
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
