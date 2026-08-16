import { apiRequest } from "./client";
import type { Environment } from "../types";

export interface StartRunParams {
  specIds: string[];
  environment: Environment;
  headless: boolean;
  socketId: string;
}

export function startRun(params: StartRunParams): Promise<{ runId: string }> {
  return apiRequest<{ runId: string }>("/runs/start", { method: "POST", body: params });
}

export function stopRun(runId: string): Promise<{ stopped: boolean }> {
  return apiRequest<{ stopped: boolean }>(`/runs/${runId}/stop`, { method: "POST" });
}
