import { apiRequest } from "./client";
import type { RunRecord } from "../types";

export interface HistoryStats {
  total: number;
  passed: number;
  failed: number;
  cancelled: number;
}

export interface HistoryResponse {
  runs: RunRecord[];
  stats: HistoryStats;
}

export function getHistory(): Promise<HistoryResponse> {
  return apiRequest<HistoryResponse>("/history");
}
