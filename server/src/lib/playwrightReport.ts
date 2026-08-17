import { readFile } from "fs/promises";
import type { RunCounts } from "../types";

interface PlaywrightJsonSpec {
  file: string;
  ok: boolean;
}

interface PlaywrightJsonSuite {
  specs?: PlaywrightJsonSpec[];
  suites?: PlaywrightJsonSuite[];
}

interface PlaywrightJsonReport {
  stats: { expected: number; unexpected: number; skipped: number; flaky: number };
  suites: PlaywrightJsonSuite[];
}

export function collectFailedFiles(suites: PlaywrightJsonSuite[] | undefined, failed: Set<string>): void {
  if (!suites) return;
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      if (!spec.ok) failed.add(spec.file);
    }
    collectFailedFiles(suite.suites, failed);
  }
}

/**
 * Reads and parses a Playwright JSON reporter output file. Returns null for
 * a missing or unparseable file (e.g. the process crashed before any
 * reporter could write one) — callers fall back to exit-code-only status
 * in that case rather than treating it as an error.
 */
export async function parseJsonReport(filePath: string): Promise<{ counts: RunCounts; failedFiles: string[] } | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const report: PlaywrightJsonReport = JSON.parse(raw);
    const failed = new Set<string>();
    collectFailedFiles(report.suites, failed);
    return {
      counts: {
        passed: report.stats.expected,
        failed: report.stats.unexpected,
        skipped: report.stats.skipped,
        flaky: report.stats.flaky,
      },
      failedFiles: [...failed],
    };
  } catch {
    return null;
  }
}
