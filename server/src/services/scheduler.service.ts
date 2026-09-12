import { schedule as scheduleCron, type ScheduledTask } from "node-cron";
import type { Server } from "socket.io";
import { cadenceToCron } from "../lib/cadence";
import { Schedule, type HydratedSchedule } from "../models/Schedule";
import { discoverSpecs } from "./specDiscovery.service";
import { sendRunReportEmail } from "./email.service";
import { recordLastEmail, recordLastRun } from "./scheduleRepository.service";
import { startRun, getActiveRuns, type RunOutcome } from "./testRunner.service";

/**
 * One cron task per enabled schedule, keyed by schedule id. Held in memory
 * and rebuilt from the database at startup — the database is the source of
 * truth, this map is just the live wiring.
 */
const tasks = new Map<string, ScheduledTask>();

let ioRef: Server | null = null;

/** Which specs a schedule should run right now — "all" is resolved at fire time, not when it was saved. */
async function resolveSpecIds(doc: HydratedSchedule): Promise<string[]> {
  if (doc.specSelection.mode === "specific") return doc.specSelection.specIds;
  const specs = await discoverSpecs();
  return specs.map((spec) => spec.id);
}

/**
 * Runs one schedule now. Skips if a run is already in progress: a free-tier
 * Render instance has room for one Playwright browser at a time, and an
 * hourly schedule that overlaps its own previous run would pile up.
 */
export async function runScheduleNow(doc: HydratedSchedule): Promise<{ runId: string } | { skipped: string }> {
  if (!ioRef) return { skipped: "The scheduler isn't running" };

  if (getActiveRuns().length > 0) {
    return { skipped: "Another run is already in progress" };
  }

  const specIds = await resolveSpecIds(doc);
  if (specIds.length === 0) return { skipped: "This schedule has no specs to run" };

  const scheduleId = String(doc._id);
  const { runId } = await startRun(
    {
      specIds,
      environment: doc.environment,
      // Always headless: there's no screen to watch on the server, and a
      // headed browser would just burn memory.
      headless: true,
      trigger: "scheduled",
      scheduleId,
      scheduleName: doc.name,
    },
    ioRef,
    (outcome) => onScheduledRunComplete(scheduleId, doc.name, doc.emailTo, doc.environment, outcome),
  );

  await recordLastRun(scheduleId, {
    runId,
    status: "running",
    startedAt: new Date().toISOString(),
    specCount: specIds.length,
    hasReport: false,
  });

  return { runId };
}

async function onScheduledRunComplete(
  scheduleId: string,
  scheduleName: string,
  emailTo: string,
  environment: HydratedSchedule["environment"],
  outcome: RunOutcome,
): Promise<void> {
  await recordLastRun(scheduleId, {
    runId: outcome.runId,
    status: outcome.status,
    startedAt: new Date(Date.now() - outcome.durationMs).toISOString(),
    specCount: outcome.specCount,
    hasReport: outcome.hasReport,
  });

  const result = await sendRunReportEmail({
    to: emailTo,
    scheduleName,
    runId: outcome.runId,
    status: outcome.status,
    environment,
    specCount: outcome.specCount,
    durationMs: outcome.durationMs,
    counts: outcome.counts,
    hasReport: outcome.hasReport,
  });
  await recordLastEmail(scheduleId, result);
}

/** Registers (or re-registers) a schedule's cron task. Disabled schedules get none. */
export function registerSchedule(doc: HydratedSchedule): void {
  const id = String(doc._id);
  unregisterSchedule(id);
  // Deliberately not conditional on the socket server being up yet: a task
  // registered before startup finishes still fires correctly, and a fire
  // with nowhere to stream to is handled where the run is started.
  if (!doc.enabled) return;

  const task = scheduleCron(
    cadenceToCron(doc.cadence),
    async () => {
      // Re-read on every fire: the schedule may have been edited since it
      // was registered, and a deleted one must not run.
      const fresh = await Schedule.findById(id);
      if (!fresh || !fresh.enabled) return;
      const result = await runScheduleNow(fresh);
      if ("skipped" in result) {
        console.log(`Schedule "${fresh.name}" skipped: ${result.skipped}`);
      }
    },
    { timezone: doc.timeZone },
  );

  tasks.set(id, task);
}

export function unregisterSchedule(id: string): void {
  const existing = tasks.get(id);
  if (existing) {
    existing.stop();
    tasks.delete(id);
  }
}

/** Loads every enabled schedule from the database and starts its cron task. */
export async function startScheduler(io: Server): Promise<number> {
  ioRef = io;
  for (const id of [...tasks.keys()]) unregisterSchedule(id);

  const docs = await Schedule.find({ enabled: true });
  for (const doc of docs) registerSchedule(doc);
  return docs.length;
}

/** Test helper: drops every live cron task and forgets the server. */
export function stopScheduler(): void {
  for (const id of [...tasks.keys()]) unregisterSchedule(id);
  ioRef = null;
}

export function scheduledTaskCount(): number {
  return tasks.size;
}
