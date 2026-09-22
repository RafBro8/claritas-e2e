export interface Spec {
  /** Filename without extension - what gets passed to `npx playwright test <id>`. */
  id: string;
  fileName: string;
  /** Human-readable title: the spec's top-level describe() block if it has one, else derived from the filename. */
  title: string;
}

export type Environment = "local" | "live";

export type RunTrigger = "manual" | "scheduled";

export type RunStatus = "running" | "passed" | "failed" | "skipped" | "cancelled";

export type FailureCategory = "ui-change" | "environment" | "unknown";

export interface FailureAnalysis {
  category: FailureCategory;
  /** 0-1. Ties or zero-signal runs land at low confidence with category "unknown" - a human should look. */
  confidence: number;
  /** Plain-English reasons behind the category, shown verbatim in the UI badge tooltip. */
  signals: string[];
}

export interface HealthProbe {
  /** null means no health check was performed (e.g. skipped for this environment). */
  ok: boolean | null;
  checkedAt: string;
  statusCode?: number;
  error?: string;
}

export interface StartRunConfig {
  specIds: string[];
  environment: Environment;
  headless: boolean;
  /**
   * The requesting client's Socket.io connection id, so the server can join
   * it to the run's room. Absent for scheduled runs, which nobody is
   * watching when they start - the run still streams to its own room, so a
   * dashboard that joins later sees the tail of it.
   */
  socketId?: string;
  trigger?: RunTrigger;
  /** Set for scheduled runs, so history can say which schedule started this. */
  scheduleId?: string;
  scheduleName?: string;
}

export interface RunCounts {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
}

export interface RunRecord {
  runId: string;
  specIds: string[];
  specCount: number;
  environment: Environment;
  headless: boolean;
  trigger: RunTrigger;
  scheduleId?: string;
  scheduleName?: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  counts?: RunCounts;
  failureAnalysis?: FailureAnalysis;
  healthProbe?: HealthProbe;
  hasReport: boolean;
}

export interface RunStartedEvent {
  runId: string;
  specIds: string[];
  specCount: number;
  environment: Environment;
  headless: boolean;
  startedAt: string;
}

export interface RunOutputEvent {
  runId: string;
  line: string;
  type: "stdout" | "stderr";
}

export interface RunCompletedEvent {
  runId: string;
  exitCode: number;
  durationMs: number;
  status: RunStatus;
  counts: RunCounts;
  hasReport: boolean;
  failureAnalysis?: FailureAnalysis;
  healthProbe?: HealthProbe;
}

export type CadenceType = "hourly" | "daily" | "weekdays" | "weekly" | "custom";

/**
 * When a schedule fires. The friendly types are stored as their parts so the
 * UI can render them as controls; "custom" is a raw cron expression for
 * anything they don't cover.
 */
export interface Cadence {
  type: CadenceType;
  /** 0-59. Used by every type except custom. */
  minute?: number;
  /** 0-23. Used by daily, weekdays and weekly. */
  hour?: number;
  /** 0 (Sunday) - 6 (Saturday). Weekly only. */
  dayOfWeek?: number;
  /** Cron expression. Custom only. */
  expression?: string;
}

/** What a schedule runs: every spec in the repo, or a fixed list. */
export interface SpecSelection {
  mode: "all" | "specific";
  specIds: string[];
}

export interface ScheduleLastRun {
  runId: string;
  status: RunStatus;
  startedAt: string;
  specCount: number;
  hasReport: boolean;
}

export interface ScheduleLastEmail {
  status: "sent" | "failed" | "skipped";
  at: string;
  detail?: string;
}

export interface ScheduleRecord {
  id: string;
  name: string;
  cadence: Cadence;
  /** IANA zone the cadence is read in, e.g. "America/Chicago". */
  timeZone: string;
  environment: Environment;
  specSelection: SpecSelection;
  /** Where to email the report. Empty means no email for this schedule. */
  emailTo: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** Plain English, e.g. "Every weekday at 09:00". Derived, never stored. */
  description: string;
  /** null while paused - a paused schedule has no next run. */
  nextRunAt: string | null;
  lastRun?: ScheduleLastRun;
  lastEmail?: ScheduleLastEmail;
}
