import { Schema, model, type HydratedDocument } from "mongoose";
import type { Cadence, Environment, ScheduleLastEmail, ScheduleLastRun, SpecSelection } from "../types";

export interface ScheduleDocument {
  name: string;
  cadence: Cadence;
  timeZone: string;
  environment: Environment;
  specSelection: SpecSelection;
  emailTo: string;
  enabled: boolean;
  lastRun?: ScheduleLastRun;
  lastEmail?: ScheduleLastEmail;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedSchedule = HydratedDocument<ScheduleDocument>;

const cadenceSchema = new Schema<Cadence>(
  {
    type: { type: String, enum: ["hourly", "daily", "weekdays", "weekly", "custom"], required: true },
    minute: { type: Number, min: 0, max: 59 },
    hour: { type: Number, min: 0, max: 23 },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    expression: { type: String, trim: true },
  },
  { _id: false },
);

const specSelectionSchema = new Schema<SpecSelection>(
  {
    // "all" deliberately stores no spec ids: a schedule set to everything
    // should pick up specs added to Provisio later, not a frozen list.
    mode: { type: String, enum: ["all", "specific"], required: true },
    specIds: { type: [String], default: [] },
  },
  { _id: false },
);

const lastRunSchema = new Schema<ScheduleLastRun>(
  {
    runId: { type: String, required: true },
    status: { type: String, required: true },
    startedAt: { type: String, required: true },
    specCount: { type: Number, required: true },
    hasReport: { type: Boolean, required: true },
  },
  { _id: false },
);

const lastEmailSchema = new Schema<ScheduleLastEmail>(
  {
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    at: { type: String, required: true },
    detail: { type: String },
  },
  { _id: false },
);

const scheduleSchema = new Schema<ScheduleDocument>(
  {
    name: { type: String, required: true, trim: true },
    cadence: { type: cadenceSchema, required: true },
    timeZone: { type: String, required: true, default: "UTC" },
    environment: { type: String, enum: ["local", "live"], required: true },
    specSelection: { type: specSelectionSchema, required: true },
    emailTo: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, required: true, default: true },
    lastRun: { type: lastRunSchema },
    lastEmail: { type: lastEmailSchema },
  },
  { timestamps: true },
);

export const Schedule = model<ScheduleDocument>("Schedule", scheduleSchema);
