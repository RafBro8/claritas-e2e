import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { Server } from "socket.io";

// testRunner.service's startRun spawns a real `npx playwright test` child
// process — not something a fast, hermetic unit test should trigger. These
// route tests cover validation and delegation only ("routes are thin: they
// validate input and call a service"); the run pipeline itself is covered
// by its own unit tests (failureClassifier, envHealth, specDiscovery,
// reportArchive, and the extracted lib/ helpers) plus real manual/browser
// verification of the full spawn-and-stream flow.
vi.mock("../../services/testRunner.service", () => ({
  startRun: vi.fn(),
  stopRun: vi.fn(),
  getActiveRuns: vi.fn(),
}));

import { createApp } from "../../app";
import { startRun, stopRun, getActiveRuns } from "../../services/testRunner.service";

const app = createApp(new Server());

const validBody = { specIds: ["auth"], environment: "local" as const, headless: true, socketId: "socket-abc" };

describe("POST /api/runs/start", () => {
  beforeEach(() => {
    vi.mocked(startRun).mockReset();
    vi.mocked(stopRun).mockReset();
    vi.mocked(getActiveRuns).mockReset();
  });

  it("rejects a missing specIds array", async () => {
    const { specIds: _specIds, ...rest } = validBody;
    const res = await request(app).post("/api/runs/start").send(rest);
    expect(res.status).toBe(400);
    expect(startRun).not.toHaveBeenCalled();
  });

  it("rejects an empty specIds array", async () => {
    const res = await request(app).post("/api/runs/start").send({ ...validBody, specIds: [] });
    expect(res.status).toBe(400);
  });

  it("rejects a non-string entry in specIds", async () => {
    const res = await request(app).post("/api/runs/start").send({ ...validBody, specIds: ["auth", 5] });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid environment value", async () => {
    const res = await request(app).post("/api/runs/start").send({ ...validBody, environment: "staging" });
    expect(res.status).toBe(400);
  });

  it("rejects a non-boolean headless value", async () => {
    const res = await request(app).post("/api/runs/start").send({ ...validBody, headless: "yes" });
    expect(res.status).toBe(400);
  });

  it("rejects a missing socketId", async () => {
    const { socketId: _socketId, ...rest } = validBody;
    const res = await request(app).post("/api/runs/start").send(rest);
    expect(res.status).toBe(400);
  });

  it("delegates to startRun with the validated config and returns its runId", async () => {
    vi.mocked(startRun).mockResolvedValue({ runId: "run_mock_123" });

    const res = await request(app)
      .post("/api/runs/start")
      .send({ specIds: ["auth", "booking-flow"], environment: "live", headless: false, socketId: "socket-abc" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ runId: "run_mock_123" });
    expect(startRun).toHaveBeenCalledWith(
      { specIds: ["auth", "booking-flow"], environment: "live", headless: false, socketId: "socket-abc" },
      expect.anything(),
    );
  });
});

describe("POST /api/runs/:id/stop", () => {
  beforeEach(() => {
    vi.mocked(stopRun).mockReset();
  });

  it("returns 404 when there's no active run with that id", async () => {
    vi.mocked(stopRun).mockReturnValue(false);
    const res = await request(app).post("/api/runs/nope/stop");
    expect(res.status).toBe(404);
  });

  it("returns 200 and stopped:true when the run was active", async () => {
    vi.mocked(stopRun).mockReturnValue(true);
    const res = await request(app).post("/api/runs/run_mock_123/stop");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stopped: true });
  });
});

describe("GET /api/runs/active", () => {
  it("returns whatever getActiveRuns reports", async () => {
    vi.mocked(getActiveRuns).mockReturnValue([
      { runId: "run_x", environment: "local", specCount: 1, startedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const res = await request(app).get("/api/runs/active");

    expect(res.status).toBe(200);
    expect(res.body.runs).toHaveLength(1);
    expect(res.body.runs[0].runId).toBe("run_x");
  });

  it("returns an empty array when nothing is running", async () => {
    vi.mocked(getActiveRuns).mockReturnValue([]);
    const res = await request(app).get("/api/runs/active");
    expect(res.body.runs).toEqual([]);
  });
});
