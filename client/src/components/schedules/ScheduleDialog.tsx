import { useEffect, useMemo, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { previewCadence, type ScheduleInput } from "../../api/schedules";
import { ApiError } from "../../api/client";
import type { Cadence, CadenceType, Environment, ScheduleRecord, Spec } from "../../types";

const CADENCE_OPTIONS: { value: CadenceType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputClass =
  "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";
const chipClass = (active: boolean): string =>
  `rounded-lg px-3 py-1.5 text-sm ${
    active ? "bg-blue-600 font-medium text-white" : "border border-slate-700 text-slate-300 hover:text-white"
  }`;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "09:30" for the time input, from the cadence's hour and minute parts. */
function toTimeValue(cadence: Cadence): string {
  return `${pad(cadence.hour ?? 9)}:${pad(cadence.minute ?? 0)}`;
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function emptyDraft(): ScheduleInput {
  return {
    name: "",
    cadence: { type: "daily", minute: 0, hour: 9 },
    timeZone: browserTimeZone(),
    // Matches the Dashboard default, and keeps a new schedule off the real
    // Provisio site until someone deliberately picks Live.
    environment: "local",
    specSelection: { mode: "all", specIds: [] },
    emailTo: "",
    enabled: true,
  };
}

interface Props {
  /** The schedule being edited, or null when creating a new one. */
  schedule: ScheduleRecord | null;
  specs: Spec[];
  emailConfigured: boolean;
  onSave: (input: ScheduleInput) => Promise<void>;
  onClose: () => void;
}

export function ScheduleDialog({ schedule, specs, emailConfigured, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<ScheduleInput>(() =>
    schedule
      ? {
          name: schedule.name,
          cadence: schedule.cadence,
          timeZone: schedule.timeZone,
          environment: schedule.environment,
          specSelection: schedule.specSelection,
          emailTo: schedule.emailTo,
          enabled: schedule.enabled,
        }
      : emptyDraft(),
  );
  const [preview, setPreview] = useState<{ description: string; nextRuns: string[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { cadence, timeZone } = draft;

  // Debounced, so typing a cron expression doesn't fire a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await previewCadence(cadence, timeZone);
        if (!cancelled) {
          setPreview(result);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(err instanceof ApiError ? err.message : "Couldn't work out when this would run");
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cadence, timeZone]);

  function patchCadence(patch: Partial<Cadence>): void {
    setDraft((d) => ({ ...d, cadence: { ...d.cadence, ...patch } }));
  }

  function selectCadenceType(type: CadenceType): void {
    setDraft((d) => {
      const { minute = 0, hour = 9, dayOfWeek = 1, expression } = d.cadence;
      return {
        ...d,
        cadence:
          type === "custom"
            ? { type, expression: expression ?? "0 9 * * 1-5" }
            : { type, minute, hour, dayOfWeek, expression },
      };
    });
  }

  function toggleSpec(id: string): void {
    setDraft((d) => {
      const selected = new Set(d.specSelection.specIds);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      return { ...d, specSelection: { mode: "specific", specIds: [...selected] } };
    });
  }

  async function handleSubmit(): Promise<void> {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save this schedule");
    } finally {
      setIsSaving(false);
    }
  }

  const nextRunsLabel = useMemo(
    () =>
      preview?.nextRuns
        .map((iso) =>
          new Date(iso).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        )
        .join(" · "),
    [preview],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={schedule ? "Edit schedule" : "New schedule"}
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <CalendarClock className="h-4 w-4 text-blue-400" aria-hidden="true" />
            {schedule ? "Edit schedule" : "New schedule"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Weekday live smoke"
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className={labelClass}>How often</span>
            <div role="radiogroup" aria-label="How often" className="flex flex-wrap gap-1.5">
              {CADENCE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={cadence.type === value}
                  onClick={() => selectCadenceType(value)}
                  className={chipClass(cadence.type === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {cadence.type === "hourly" && (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>At minute</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={cadence.minute ?? 0}
                  onChange={(e) => patchCadence({ minute: Number(e.target.value) })}
                  className={`${inputClass} w-24`}
                />
              </label>
            )}

            {(cadence.type === "daily" || cadence.type === "weekdays" || cadence.type === "weekly") && (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>At</span>
                <input
                  type="time"
                  value={toTimeValue(cadence)}
                  onChange={(e) => {
                    const [hour, minute] = e.target.value.split(":").map(Number);
                    patchCadence({ hour, minute });
                  }}
                  className={`${inputClass} w-32`}
                />
              </label>
            )}

            {cadence.type === "weekly" && (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>On</span>
                <select
                  value={cadence.dayOfWeek ?? 1}
                  onChange={(e) => patchCadence({ dayOfWeek: Number(e.target.value) })}
                  aria-label="Day of the week"
                  className={inputClass}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {cadence.type === "custom" && (
              <label className="flex flex-1 flex-col gap-1.5">
                <span className={labelClass}>Cron expression</span>
                <input
                  value={cadence.expression ?? ""}
                  onChange={(e) => patchCadence({ expression: e.target.value })}
                  placeholder="0 9 * * 1-5"
                  spellCheck={false}
                  className={`${inputClass} font-mono`}
                />
              </label>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            {previewError ? (
              <span className="text-amber-400">{previewError}</span>
            ) : preview ? (
              <>
                <p className="font-medium text-slate-100">{preview.description}</p>
                <p className="mt-1 text-xs text-slate-500">Next: {nextRunsLabel}</p>
                <p className="mt-1 text-xs text-slate-600">Times shown in {timeZone}</p>
              </>
            ) : (
              <span className="text-slate-500">Working out when this runs…</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClass}>Environment</span>
            <div role="radiogroup" aria-label="Environment" className="flex gap-1.5">
              {(["local", "live"] as Environment[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={draft.environment === value}
                  onClick={() => setDraft((d) => ({ ...d, environment: value }))}
                  className={chipClass(draft.environment === value)}
                >
                  {value === "local" ? "Local" : "Live"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClass}>What to run</span>
            <div role="radiogroup" aria-label="What to run" className="flex gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={draft.specSelection.mode === "all"}
                onClick={() => setDraft((d) => ({ ...d, specSelection: { mode: "all", specIds: [] } }))}
                className={chipClass(draft.specSelection.mode === "all")}
              >
                All specs
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={draft.specSelection.mode === "specific"}
                onClick={() =>
                  setDraft((d) => ({ ...d, specSelection: { mode: "specific", specIds: d.specSelection.specIds } }))
                }
                className={chipClass(draft.specSelection.mode === "specific")}
              >
                Specific specs
              </button>
            </div>

            {draft.specSelection.mode === "all" ? (
              <p className="text-xs text-slate-500">
                Runs every spec in the suite ({specs.length}) — specs added later are included automatically.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-3">
                {specs.map((spec) => (
                  <label key={spec.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.specSelection.specIds.includes(spec.id)}
                      onChange={() => toggleSpec(spec.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {spec.title}
                    <span className="font-mono text-xs text-slate-600">{spec.fileName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email report to (optional)</span>
            <input
              type="email"
              value={draft.emailTo}
              onChange={(e) => setDraft((d) => ({ ...d, emailTo: e.target.value }))}
              placeholder="name@example.com"
              className={inputClass}
            />
            {!emailConfigured && draft.emailTo.trim() !== "" && (
              <span className="text-xs text-amber-400">
                Email isn't set up on the server yet, so reports won't send. The address is saved for when it is.
              </span>
            )}
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="h-4 w-4 accent-blue-600"
            />
            Enabled
          </label>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : schedule ? "Save changes" : "Create schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
