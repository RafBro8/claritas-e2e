// Deliberately duplicated from server/src/types/index.ts rather than shared
// via a package — the server is CommonJS, the client is bundled by Vite,
// and a shared package would add build coupling this project doesn't need.
// Keep the two in sync by hand when either shape changes.

export interface Spec {
  id: string;
  fileName: string;
  title: string;
}

export type Environment = "local" | "live";

export type RunStatus = "running" | "passed" | "failed" | "skipped" | "cancelled";

export type FailureCategory = "ui-change" | "environment" | "unknown";

export interface FailureAnalysis {
  category: FailureCategory;
  confidence: number;
  signals: string[];
}

export interface HealthProbe {
  ok: boolean | null;
  checkedAt: string;
  statusCode?: number;
  error?: string;
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

export type UserRole = "Product Owner" | "Business End User" | "Developer";
