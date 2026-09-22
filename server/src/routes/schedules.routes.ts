import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { describeCadence, isValidTimeZone, nextRuns, validateCadence } from "../lib/cadence";
import { isEmailConfigured } from "../services/email.service";
import {
  createSchedule,
  deleteSchedule,
  findSchedule,
  listSchedules,
  toScheduleRecord,
  updateSchedule,
} from "../services/scheduleRepository.service";
import { registerSchedule, runScheduleNow, unregisterSchedule } from "../services/scheduler.service";
import type { Cadence, Environment, SpecSelection } from "../types";

// A plain address check: enough to catch a typo, without pretending to
// validate deliverability, which only sending can really do.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ScheduleInput {
  name: string;
  cadence: Cadence;
  timeZone: string;
  environment: Environment;
  specSelection: SpecSelection;
  emailTo: string;
  enabled: boolean;
}

/** Validates the parts of a schedule that are present, throwing the first problem as a 400. */
function readScheduleInput(body: unknown, { partial }: { partial: boolean }): Partial<ScheduleInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const out: Partial<ScheduleInput> = {};

  if (input.name !== undefined || !partial) {
    if (typeof input.name !== "string" || !input.name.trim()) throw new AppError(400, "A name is required");
    if (input.name.trim().length > 80) throw new AppError(400, "Name must be 80 characters or fewer");
    out.name = input.name.trim();
  }

  if (input.cadence !== undefined || !partial) {
    const problem = validateCadence(input.cadence);
    if (problem) throw new AppError(400, problem);
    out.cadence = input.cadence as Cadence;
  }

  if (input.timeZone !== undefined || !partial) {
    if (!isValidTimeZone(input.timeZone)) throw new AppError(400, "An IANA time zone is required, e.g. America/Chicago");
    out.timeZone = input.timeZone as string;
  }

  if (input.environment !== undefined || !partial) {
    if (input.environment !== "local" && input.environment !== "live") {
      throw new AppError(400, 'environment must be "local" or "live"');
    }
    out.environment = input.environment;
  }

  if (input.specSelection !== undefined || !partial) {
    const selection = input.specSelection as SpecSelection | undefined;
    if (!selection || (selection.mode !== "all" && selection.mode !== "specific")) {
      throw new AppError(400, 'What to run must be "all" or "specific"');
    }
    const specIds = Array.isArray(selection.specIds) ? selection.specIds : [];
    if (!specIds.every((id) => typeof id === "string")) throw new AppError(400, "specIds must be strings");
    if (selection.mode === "specific" && specIds.length === 0) {
      throw new AppError(400, "Pick at least one spec, or choose all specs");
    }
    out.specSelection = { mode: selection.mode, specIds: selection.mode === "all" ? [] : specIds };
  }

  if (input.emailTo !== undefined) {
    if (typeof input.emailTo !== "string") throw new AppError(400, "emailTo must be a string");
    const emailTo = input.emailTo.trim();
    if (emailTo && !EMAIL_PATTERN.test(emailTo)) throw new AppError(400, `"${emailTo}" doesn't look like an email address`);
    out.emailTo = emailTo;
  }

  if (input.enabled !== undefined) {
    if (typeof input.enabled !== "boolean") throw new AppError(400, "enabled must be a boolean");
    out.enabled = input.enabled;
  }

  return out;
}

export const schedulesRouter = Router();

schedulesRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ schedules: await listSchedules(), emailConfigured: isEmailConfigured() });
  } catch (err) {
    next(err);
  }
});

/**
 * Previews a cadence before it's saved - the "Every weekday at 09:00, next:
 * ..." line in the dialog. Computed here rather than in the browser so the
 * preview comes from the same code that will actually run the schedule.
 */
schedulesRouter.post("/preview", (req, res, next) => {
  try {
    const { cadence, timeZone } = (req.body ?? {}) as { cadence?: Cadence; timeZone?: string };
    const problem = validateCadence(cadence);
    if (problem) throw new AppError(400, problem);
    if (!isValidTimeZone(timeZone)) throw new AppError(400, "An IANA time zone is required, e.g. America/Chicago");

    res.json({
      description: describeCadence(cadence as Cadence),
      nextRuns: nextRuns(cadence as Cadence, timeZone as string).map((date) => date.toISOString()),
    });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post("/", async (req, res, next) => {
  try {
    const input = readScheduleInput(req.body, { partial: false }) as ScheduleInput;
    const doc = await createSchedule({
      name: input.name,
      cadence: input.cadence,
      timeZone: input.timeZone,
      environment: input.environment,
      specSelection: input.specSelection,
      emailTo: input.emailTo ?? "",
      enabled: input.enabled ?? true,
    });
    registerSchedule(doc);
    res.status(201).json({ schedule: toScheduleRecord(doc) });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.patch("/:id", async (req, res, next) => {
  try {
    const doc = await findSchedule(req.params.id);
    if (!doc) throw new AppError(404, "No schedule with that id");

    const patch = readScheduleInput(req.body, { partial: true });
    const updated = await updateSchedule(doc, patch);
    // Re-registered on every edit: the cron expression, timezone or enabled
    // state may all have changed.
    registerSchedule(updated);
    res.json({ schedule: toScheduleRecord(updated) });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.delete("/:id", async (req, res, next) => {
  try {
    const doc = await findSchedule(req.params.id);
    if (!doc) throw new AppError(404, "No schedule with that id");
    unregisterSchedule(String(doc._id));
    await deleteSchedule(doc);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post("/:id/run-now", async (req, res, next) => {
  try {
    const doc = await findSchedule(req.params.id);
    if (!doc) throw new AppError(404, "No schedule with that id");

    const result = await runScheduleNow(doc);
    if ("skipped" in result) throw new AppError(409, result.skipped);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
