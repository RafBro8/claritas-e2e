import { describe, it, expect } from "vitest";
import request from "supertest";
import { Server } from "socket.io";
import { createApp } from "../../app";
import { createRun, completeRun } from "../../services/runRepository.service";

const app = createApp(new Server());

describe("GET /api/history", () => {
  it("returns an empty list and zeroed stats when no runs exist yet", async () => {
    const res = await request(app).get("/api/history");

    expect(res.status).toBe(200);
    expect(res.body.runs).toEqual([]);
    expect(res.body.stats).toEqual({ total: 0, passed: 0, failed: 0, cancelled: 0 });
  });

  it("returns persisted runs newest-first alongside aggregate stats", async () => {
    await createRun({
      runId: "run_hist_1",
      specIds: ["auth"],
      environment: "local",
      headless: true,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await completeRun("run_hist_1", {
      status: "passed",
      completedAt: new Date("2026-01-01T00:00:10.000Z"),
      durationMs: 10_000,
      exitCode: 0,
      counts: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
      hasReport: true,
      failureAnalysis: undefined,
      healthProbe: undefined,
    });

    const res = await request(app).get("/api/history");

    expect(res.status).toBe(200);
    expect(res.body.runs).toHaveLength(1);
    expect(res.body.runs[0]).toMatchObject({ runId: "run_hist_1", status: "passed" });
    expect(res.body.stats).toEqual({ total: 1, passed: 1, failed: 0, cancelled: 0 });
  });
});
