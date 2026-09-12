import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { Server } from "socket.io";
import { createApp } from "../../app";
import { stopScheduler, scheduledTaskCount } from "../../services/scheduler.service";

const app = createApp(new Server());

const VALID = {
  name: "Weekday smoke",
  cadence: { type: "weekdays", minute: 0, hour: 9 },
  timeZone: "America/Chicago",
  environment: "local",
  specSelection: { mode: "all", specIds: [] },
  emailTo: "team@example.com",
  enabled: true,
};

async function create(overrides: Record<string, unknown> = {}) {
  return request(app).post("/api/schedules").send({ ...VALID, ...overrides });
}

// Creating a schedule registers a live cron task; without this they'd
// accumulate across tests and keep the process alive.
afterEach(() => stopScheduler());

describe("POST /api/schedules", () => {
  it("creates a schedule and returns it with a description and next run time", async () => {
    const res = await create();

    expect(res.status).toBe(201);
    expect(res.body.schedule).toMatchObject({
      name: "Weekday smoke",
      description: "Every weekday at 09:00",
      environment: "local",
      enabled: true,
    });
    expect(new Date(res.body.schedule.nextRunAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects the ways a schedule can be malformed, one clear message each", async () => {
    expect((await create({ name: "  " })).body.error).toMatch(/name is required/i);
    expect((await create({ cadence: { type: "daily", minute: 0, hour: 99 } })).body.error).toMatch(/hour/i);
    expect((await create({ timeZone: "Mars/Olympus_Mons" })).body.error).toMatch(/time zone/i);
    expect((await create({ environment: "staging" })).body.error).toMatch(/environment/i);
    expect((await create({ specSelection: { mode: "specific", specIds: [] } })).body.error).toMatch(/at least one spec/i);
    expect((await create({ emailTo: "not-an-address" })).body.error).toMatch(/email address/i);
  });

  it("stores no spec ids for an all-specs schedule, so later specs are included automatically", async () => {
    const res = await create({ specSelection: { mode: "all", specIds: ["auth"] } });
    expect(res.body.schedule.specSelection).toEqual({ mode: "all", specIds: [] });
  });

  it("accepts a custom cron expression and rejects a broken one", async () => {
    const ok = await create({ cadence: { type: "custom", expression: "*/15 9-17 * * 1-5" } });
    expect(ok.status).toBe(201);
    expect(ok.body.schedule.description).toBe("Custom schedule (*/15 9-17 * * 1-5)");

    const bad = await create({ cadence: { type: "custom", expression: "every 15 minutes" } });
    expect(bad.status).toBe(400);
  });
});

describe("GET /api/schedules", () => {
  it("lists schedules and says whether email is configured on this server", async () => {
    await create();

    const res = await request(app).get("/api/schedules");

    expect(res.status).toBe(200);
    expect(res.body.schedules).toHaveLength(1);
    // No SMTP settings in the test environment, so the UI should be told so.
    expect(res.body.emailConfigured).toBe(false);
  });
});

describe("PATCH /api/schedules/:id", () => {
  it("updates only what was sent, and re-derives the description", async () => {
    const { body } = await create();

    const res = await request(app)
      .patch(`/api/schedules/${body.schedule.id}`)
      .send({ cadence: { type: "hourly", minute: 15 } });

    expect(res.status).toBe(200);
    expect(res.body.schedule).toMatchObject({ name: "Weekday smoke", description: "Every hour at :15" });
  });

  it("has no next run time once paused, and stops its cron task", async () => {
    const { body } = await create();
    expect(scheduledTaskCount()).toBe(1);

    const res = await request(app).patch(`/api/schedules/${body.schedule.id}`).send({ enabled: false });

    expect(res.body.schedule.nextRunAt).toBeNull();
    expect(scheduledTaskCount()).toBe(0);
  });

  it("404s for an id that doesn't exist, and for one that isn't an id at all", async () => {
    expect((await request(app).patch("/api/schedules/000000000000000000000000").send({ enabled: false })).status).toBe(404);
    expect((await request(app).patch("/api/schedules/nonsense").send({ enabled: false })).status).toBe(404);
  });
});

describe("DELETE /api/schedules/:id", () => {
  it("removes the schedule and its cron task", async () => {
    const { body } = await create();

    const res = await request(app).delete(`/api/schedules/${body.schedule.id}`);

    expect(res.status).toBe(200);
    expect(scheduledTaskCount()).toBe(0);
    expect((await request(app).get("/api/schedules")).body.schedules).toEqual([]);
  });
});

describe("POST /api/schedules/preview", () => {
  it("describes a cadence and lists its next three runs before it's saved", async () => {
    const res = await request(app)
      .post("/api/schedules/preview")
      .send({ cadence: { type: "daily", minute: 30, hour: 6 }, timeZone: "UTC" });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe("Every day at 06:30");
    expect(res.body.nextRuns).toHaveLength(3);
    const times = res.body.nextRuns.map((iso: string) => new Date(iso).getTime());
    expect(times[0]).toBeLessThan(times[1]);
    expect(times[1]).toBeLessThan(times[2]);
  });

  it("explains a bad cadence rather than guessing", async () => {
    const res = await request(app).post("/api/schedules/preview").send({ cadence: { type: "weekly" }, timeZone: "UTC" });
    expect(res.status).toBe(400);
  });
});
