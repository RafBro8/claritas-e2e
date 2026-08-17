import { access, cp } from "fs/promises";
import path from "path";
import { env } from "../config/env";
import { REPORTS_DIR } from "../config/paths";

/**
 * Playwright overwrites its playwright-report/ directory on every run, so
 * this copies it into a per-run folder before the next run clobbers it.
 * Returns whether an archived report now exists for this run.
 *
 * sourceDir/reportsDir default to the real, env-derived locations but can
 * be overridden — lets tests exercise the missing-source case against a
 * throwaway directory instead of mutating the shared fixture suite.
 */
export async function archiveReport(
  runId: string,
  sourceDir: string = path.join(env.provisioE2ePath, "playwright-report"),
  reportsDir: string = REPORTS_DIR,
): Promise<boolean> {
  const dest = path.join(reportsDir, runId, "html");

  try {
    await access(sourceDir);
    await cp(sourceDir, dest, { recursive: true });
    return true;
  } catch {
    return false;
  }
}
