import { Schedule, type HydratedSchedule } from "../models/Schedule";
import { describeCadence, nextRun } from "../lib/cadence";
import type { ScheduleLastEmail, ScheduleLastRun, ScheduleRecord } from "../types";

/**
 * Adds the two derived fields the UI needs — the plain-English description
 * and the next fire time — which are computed rather than stored so they
 * can't drift out of date with the cadence itself.
 */
export function toScheduleRecord(doc: HydratedSchedule): ScheduleRecord {
  return {
    id: String(doc._id),
    name: doc.name,
    cadence: doc.cadence,
    timeZone: doc.timeZone,
    environment: doc.environment,
    specSelection: doc.specSelection,
    emailTo: doc.emailTo,
    enabled: doc.enabled,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    description: describeCadence(doc.cadence),
    nextRunAt: doc.enabled ? nextRun(doc.cadence, doc.timeZone).toISOString() : null,
    lastRun: doc.lastRun,
    lastEmail: doc.lastEmail,
  };
}

export async function listSchedules(): Promise<ScheduleRecord[]> {
  const docs = await Schedule.find().sort({ createdAt: -1 });
  return docs.map(toScheduleRecord);
}

export async function findSchedule(id: string): Promise<HydratedSchedule | null> {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) return null;
  return Schedule.findById(id);
}

export async function createSchedule(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt" | "description" | "nextRunAt" | "lastRun" | "lastEmail">): Promise<HydratedSchedule> {
  return Schedule.create(input);
}

export async function updateSchedule(
  doc: HydratedSchedule,
  patch: Partial<Pick<ScheduleRecord, "name" | "cadence" | "timeZone" | "environment" | "specSelection" | "emailTo" | "enabled">>,
): Promise<HydratedSchedule> {
  Object.assign(doc, patch);
  return doc.save();
}

export async function deleteSchedule(doc: HydratedSchedule): Promise<void> {
  await doc.deleteOne();
}

export async function recordLastRun(id: string, lastRun: ScheduleLastRun): Promise<void> {
  await Schedule.updateOne({ _id: id }, { $set: { lastRun } });
}

export async function recordLastEmail(id: string, lastEmail: ScheduleLastEmail): Promise<void> {
  await Schedule.updateOne({ _id: id }, { $set: { lastEmail } });
}
