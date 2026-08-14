import { env } from "../config/env";
import type { Environment, HealthProbe } from "../types";

function healthUrlFor(environment: Environment): string {
  return environment === "live" ? env.provisioLiveHealthUrl : env.provisioLocalHealthUrl;
}

/**
 * Pre-flight probe of the target environment's health endpoint, run
 * concurrently with a test run starting. A false/unreachable result before
 * the run even began is a strong signal that any failures are environment
 * issues, not the app under test — see failureClassifier.service.ts.
 */
export async function checkEnvironmentHealth(environment: Environment): Promise<HealthProbe> {
  const checkedAt = new Date().toISOString();
  const url = healthUrlFor(environment);

  if (!url) {
    return { ok: null, checkedAt };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.healthTimeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, checkedAt, statusCode: res.status };
  } catch (err) {
    return { ok: false, checkedAt, error: err instanceof Error ? err.message : "Health check failed" };
  } finally {
    clearTimeout(timeout);
  }
}
