import { describe, it, expect } from "vitest";
import { createRun, completeRun, findRun, listRecentRuns, getRunStats } from "../runRepository.service";

describe("runRepository", () => {
  it("creates a run in the running state with a derived specCount", async () => {
    await createRun({
      runId: "run_1",
      specIds: ["auth", "booking-flow"],
      environment: "local",
      headless: true,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const run = await findRun("run_1");
    expect(run).toMatchObject({
      runId: "run_1",
      specIds: ["auth", "booking-flow"],
      specCount: 2,
      environment: "local",
      headless: true,
      trigger: "manual",
      status: "running",
      hasReport: false,
    });
    expect(run?.completedAt).toBeUndefined();
  });

  it("returns null for a run id that doesn't exist", async () => {
    expect(await findRun("does-not-exist")).toBeNull();
  });

  it("fills in completion fields without touching the fields set at creation", async () => {
    await createRun({
      runId: "run_2",
      specIds: ["auth"],
      environment: "live",
      headless: false,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await completeRun("run_2", {
      status: "passed",
      completedAt: new Date("2026-01-01T00:00:20.000Z"),
      durationMs: 20_000,
      exitCode: 0,
      counts: { passed: 3, failed: 0, skipped: 0, flaky: 0 },
      hasReport: true,
      failureAnalysis: undefined,
      healthProbe: undefined,
    });

    const run = await findRun("run_2");
    expect(run).toMatchObject({
      runId: "run_2",
      environment: "live",
      status: "passed",
      durationMs: 20_000,
      exitCode: 0,
      counts: { passed: 3, failed: 0, skipped: 0, flaky: 0 },
      hasReport: true,
    });
    expect(run?.completedAt).toBe("2026-01-01T00:00:20.000Z");
  });

  it("lists runs newest-first and respects the limit", async () => {
    await createRun({
      runId: "run_old",
      specIds: ["auth"],
      environment: "local",
      headless: true,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await createRun({
      runId: "run_new",
      specIds: ["auth"],
      environment: "local",
      headless: true,
      startedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const runs = await listRecentRuns();
    expect(runs.map((r) => r.runId)).toEqual(["run_new", "run_old"]);

    const limited = await listRecentRuns(1);
    expect(limited).toHaveLength(1);
    expect(limited[0].runId).toBe("run_new");
  });

  it("computes aggregate stats across all runs regardless of the listing limit", async () => {
    const base = {
      specIds: ["auth"],
      environment: "local" as const,
      headless: true,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    await createRun({ ...base, runId: "run_a" });
    await createRun({ ...base, runId: "run_b" });
    await createRun({ ...base, runId: "run_c" });

    await completeRun("run_a", {
      status: "passed",
      completedAt: new Date(),
      durationMs: 1000,
      exitCode: 0,
      counts: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
      hasReport: true,
      failureAnalysis: undefined,
      healthProbe: undefined,
    });
    await completeRun("run_b", {
      status: "failed",
      completedAt: new Date(),
      durationMs: 1000,
      exitCode: 1,
      counts: { passed: 0, failed: 1, skipped: 0, flaky: 0 },
      hasReport: true,
      failureAnalysis: undefined,
      healthProbe: undefined,
    });
    // run_c stays "running" — should count toward total but not passed/failed/cancelled.

    const stats = await getRunStats();
    expect(stats).toEqual({ total: 3, passed: 1, failed: 1, cancelled: 0 });
  });
});
