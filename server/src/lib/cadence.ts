import { CronExpressionParser } from "cron-parser";
import { validate as isValidCron } from "node-cron";
import type { Cadence } from "../types";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isWholeNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * The friendly cadences are stored as their parts (an hour, a minute, a day)
 * rather than as cron text, so the UI can show them as controls and plain
 * English. Cron is only how they're handed to the scheduler — and the one
 * escape hatch, "custom", is cron the author typed themselves.
 */
export function cadenceToCron(cadence: Cadence): string {
  const minute = cadence.minute ?? 0;
  const hour = cadence.hour ?? 0;
  switch (cadence.type) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekdays":
      return `${minute} ${hour} * * 1-5`;
    case "weekly":
      return `${minute} ${hour} * * ${cadence.dayOfWeek ?? 1}`;
    case "custom":
      return cadence.expression ?? "";
  }
}

export function describeCadence(cadence: Cadence): string {
  const minute = cadence.minute ?? 0;
  const hour = cadence.hour ?? 0;
  const at = `${pad(hour)}:${pad(minute)}`;
  switch (cadence.type) {
    case "hourly":
      return `Every hour at :${pad(minute)}`;
    case "daily":
      return `Every day at ${at}`;
    case "weekdays":
      return `Every weekday at ${at}`;
    case "weekly":
      return `Every ${WEEKDAY_NAMES[cadence.dayOfWeek ?? 1]} at ${at}`;
    case "custom":
      return `Custom schedule (${cadence.expression})`;
  }
}

/** Returns an explanation of what's wrong with a cadence, or null if it's usable. */
export function validateCadence(cadence: unknown): string | null {
  if (typeof cadence !== "object" || cadence === null) return "A cadence is required";
  const { type, minute, hour, dayOfWeek, expression } = cadence as Partial<Cadence>;

  if (type !== "hourly" && type !== "daily" && type !== "weekdays" && type !== "weekly" && type !== "custom") {
    return "How often must be hourly, daily, weekdays, weekly, or custom";
  }

  if (type === "custom") {
    if (typeof expression !== "string" || !expression.trim()) return "A cron expression is required";
    if (!isValidCron(expression.trim())) return `"${expression}" isn't a valid cron expression`;
    return null;
  }

  if (!isWholeNumberInRange(minute, 0, 59)) return "Minute must be a whole number between 0 and 59";
  if (type !== "hourly" && !isWholeNumberInRange(hour, 0, 23)) {
    return "Hour must be a whole number between 0 and 23";
  }
  if (type === "weekly" && !isWholeNumberInRange(dayOfWeek, 0, 6)) {
    return "Day of the week must be a whole number between 0 (Sunday) and 6 (Saturday)";
  }
  return null;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || !timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The next few times a cadence will fire, as UTC instants. Computed in the
 * schedule's own timezone, so "every day at 09:00" stays 9am where the
 * author is even when the server is somewhere else (Render runs on UTC).
 */
export function nextRuns(cadence: Cadence, timeZone: string, count = 3, from = new Date()): Date[] {
  const expression = cadenceToCron(cadence);
  const interval = CronExpressionParser.parse(expression, { currentDate: from, tz: timeZone });
  return Array.from({ length: count }, () => interval.next().toDate());
}

export function nextRun(cadence: Cadence, timeZone: string, from = new Date()): Date {
  return nextRuns(cadence, timeZone, 1, from)[0];
}
