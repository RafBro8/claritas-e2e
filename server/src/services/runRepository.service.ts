import { Run, type RunDocument } from "../models/Run";
import type { RunRecord } from "../types";

function toRunRecord(doc: RunDocument): RunRecord {
  return {
    runId: doc.runId,
    specIds: doc.specIds,
    specCount: doc.specCount,
    environment: doc.environment,
    headless: doc.headless,
    trigger: doc.trigger,
    status: doc.status,
    startedAt: doc.startedAt.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    durationMs: doc.durationMs,
    exitCode: doc.exitCode,
    counts: doc.counts,
    failureAnalysis: doc.failureAnalysis,
    healthProbe: doc.healthProbe,
    hasReport: doc.hasReport,
  };
}

export async function createRun(params: {
  runId: string;
  specIds: string[];
  environment: RunDocument["environment"];
  headless: boolean;
  startedAt: Date;
}): Promise<void> {
  await Run.create({
    runId: params.runId,
    specIds: params.specIds,
    specCount: params.specIds.length,
    environment: params.environment,
    headless: params.headless,
    trigger: "manual",
    status: "running",
    startedAt: params.startedAt,
    hasReport: false,
  });
}

export async function completeRun(
  runId: string,
  update: Pick<
    RunDocument,
    "status" | "completedAt" | "durationMs" | "exitCode" | "counts" | "failureAnalysis" | "healthProbe" | "hasReport"
  >,
): Promise<void> {
  await Run.updateOne({ runId }, { $set: update });
}

export async function findRun(runId: string): Promise<RunRecord | null> {
  const doc = await Run.findOne({ runId });
  return doc ? toRunRecord(doc) : null;
}

export async function listRecentRuns(limit = 50): Promise<RunRecord[]> {
  const docs = await Run.find().sort({ startedAt: -1 }).limit(limit);
  return docs.map(toRunRecord);
}

/**
 * Any run still marked "running" at startup was orphaned by the previous
 * process dying mid-run (crash, redeploy, OOM kill) — the in-memory active-
 * run registry that would normally track and complete it doesn't survive a
 * restart, so without this it stays "running" in history forever. Marks
 * every such run "failed" instead, which is honest: it did not, in fact,
 * complete successfully. Returns how many were reconciled, for a log line.
 */
export async function reconcileOrphanedRuns(): Promise<number> {
  const result = await Run.updateMany(
    { status: "running" },
    {
      $set: {
        status: "failed",
        completedAt: new Date(),
        failureAnalysis: {
          category: "environment",
          confidence: 1,
          signals: ["The server restarted while this run was in progress and it never finished."],
        },
        hasReport: false,
      },
    },
  );
  return result.modifiedCount;
}

export async function getRunStats(): Promise<{ total: number; passed: number; failed: number; cancelled: number }> {
  const [total, passed, failed, cancelled] = await Promise.all([
    Run.countDocuments(),
    Run.countDocuments({ status: "passed" }),
    Run.countDocuments({ status: "failed" }),
    Run.countDocuments({ status: "cancelled" }),
  ]);
  return { total, passed, failed, cancelled };
}
