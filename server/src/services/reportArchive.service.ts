import { access, cp } from "fs/promises";
import path from "path";
import { env } from "../config/env";
import { REPORTS_DIR } from "../config/paths";

/**
 * Playwright overwrites its playwright-report/ directory on every run, so
 * this copies it into a per-run folder before the next run clobbers it.
 * Returns whether an archived report now exists for this run.
 */
export async function archiveReport(runId: string): Promise<boolean> {
  const source = path.join(env.provisioE2ePath, "playwright-report");
  const dest = path.join(REPORTS_DIR, runId, "html");

  try {
    await access(source);
    await cp(source, dest, { recursive: true });
    return true;
  } catch {
    return false;
  }
}
