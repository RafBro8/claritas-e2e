export interface Spec {
  /** Filename without extension — what gets passed to `npx playwright test <id>`. */
  id: string;
  fileName: string;
  /** Human-readable title: the spec's top-level describe() block if it has one, else derived from the filename. */
  title: string;
}

export type Environment = "local" | "live";

export type RunStatus = "running" | "passed" | "failed" | "skipped" | "cancelled";

export type FailureCategory = "ui-change" | "environment" | "unknown";

export interface FailureAnalysis {
  category: FailureCategory;
  /** 0-1. Ties or zero-signal runs land at low confidence with category "unknown" — a human should look. */
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
  /** The requesting client's Socket.io connection id, so the server can join it to the run's room. */
  socketId: string;
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
  trigger: "manual";
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
