import { apiRequest } from "./client";
import type { Cadence, Environment, ScheduleRecord, SpecSelection } from "../types";

export interface ScheduleInput {
  name: string;
  cadence: Cadence;
  timeZone: string;
  environment: Environment;
  specSelection: SpecSelection;
  emailTo: string;
  enabled: boolean;
}

export interface SchedulesResponse {
  schedules: ScheduleRecord[];
  /** False until SMTP settings exist on the server — the UI says so rather than promising email. */
  emailConfigured: boolean;
}

export function getSchedules(): Promise<SchedulesResponse> {
  return apiRequest<SchedulesResponse>("/schedules");
}

export function createSchedule(input: ScheduleInput): Promise<{ schedule: ScheduleRecord }> {
  return apiRequest<{ schedule: ScheduleRecord }>("/schedules", { method: "POST", body: input });
}

export function updateSchedule(id: string, patch: Partial<ScheduleInput>): Promise<{ schedule: ScheduleRecord }> {
  return apiRequest<{ schedule: ScheduleRecord }>(`/schedules/${id}`, { method: "PATCH", body: patch });
}

export function deleteSchedule(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/schedules/${id}`, { method: "DELETE" });
}

export function runScheduleNow(id: string): Promise<{ runId: string }> {
  return apiRequest<{ runId: string }>(`/schedules/${id}/run-now`, { method: "POST" });
}

export interface CadencePreview {
  description: string;
  nextRuns: string[];
}

/**
 * Asks the server what a cadence means before it's saved. Deliberately not
 * computed in the browser: the preview then comes from the same code that
 * will actually fire the schedule.
 */
export function previewCadence(cadence: Cadence, timeZone: string): Promise<CadencePreview> {
  return apiRequest<CadencePreview>("/schedules/preview", { method: "POST", body: { cadence, timeZone } });
}
