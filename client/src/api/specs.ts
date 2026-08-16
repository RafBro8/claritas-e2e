import { apiRequest } from "./client";
import type { Spec } from "../types";

export function listSpecs(): Promise<{ specs: Spec[] }> {
  return apiRequest<{ specs: Spec[] }>("/specs");
}
