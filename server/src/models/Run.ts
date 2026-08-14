import { Schema, model } from "mongoose";
import type { Environment, FailureAnalysis, HealthProbe, RunCounts, RunStatus } from "../types";

export interface RunDocument {
  runId: string;
  specIds: string[];
  specCount: number;
  environment: Environment;
  headless: boolean;
  trigger: "manual";
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  exitCode?: number;
  counts?: RunCounts;
  failureAnalysis?: FailureAnalysis;
  healthProbe?: HealthProbe;
  hasReport: boolean;
}

const failureAnalysisSchema = new Schema<FailureAnalysis>(
  {
    category: { type: String, enum: ["ui-change", "environment", "unknown"], required: true },
    confidence: { type: Number, required: true },
    signals: { type: [String], required: true },
  },
  { _id: false },
);

const healthProbeSchema = new Schema<HealthProbe>(
  {
    ok: { type: Boolean, default: null },
    checkedAt: { type: String, required: true },
    statusCode: { type: Number },
    error: { type: String },
  },
  { _id: false },
);

const runCountsSchema = new Schema<RunCounts>(
  {
    passed: { type: Number, required: true },
    failed: { type: Number, required: true },
    skipped: { type: Number, required: true },
    flaky: { type: Number, required: true },
  },
  { _id: false },
);

const runSchema = new Schema<RunDocument>({
  runId: { type: String, required: true, unique: true },
  specIds: { type: [String], required: true },
  specCount: { type: Number, required: true },
  environment: { type: String, enum: ["local", "live"], required: true },
  headless: { type: Boolean, required: true },
  trigger: { type: String, enum: ["manual"], required: true, default: "manual" },
  status: {
    type: String,
    enum: ["running", "passed", "failed", "skipped", "cancelled"],
    required: true,
  },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  durationMs: { type: Number },
  exitCode: { type: Number },
  counts: { type: runCountsSchema },
  failureAnalysis: { type: failureAnalysisSchema },
  healthProbe: { type: healthProbeSchema },
  hasReport: { type: Boolean, required: true, default: false },
});

// Run History reads newest-first almost exclusively — an index makes that a
// sorted index scan instead of a full collection sort as the history grows.
runSchema.index({ startedAt: -1 });

export const Run = model<RunDocument>("Run", runSchema);
