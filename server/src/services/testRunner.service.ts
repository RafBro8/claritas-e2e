import { spawn, exec, type ChildProcess } from "child_process";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import type { Server } from "socket.io";
import { env } from "../config/env";
import { REPORTS_DIR } from "../config/paths";
import { discoverSpecs } from "./specDiscovery.service";
import { checkEnvironmentHealth } from "./envHealth.service";
import { classifyFailure } from "./failureClassifier.service";
import { archiveReport } from "./reportArchive.service";
import { createRun, completeRun } from "./runRepository.service";
import type {
  Environment,
  FailureAnalysis,
  RunCompletedEvent,
  RunCounts,
  RunOutputEvent,
  RunStartedEvent,
  RunStatus,
  StartRunConfig,
} from "../types";

interface ActiveRun {
  child: ChildProcess;
  startedAt: number;
  environment: Environment;
  specCount: number;
  cancelled: boolean;
}

const activeRuns = new Map<string, ActiveRun>();

function roomFor(runId: string): string {
  return `run:${runId}`;
}

function generateRunId(): string {
  const hash = Math.random().toString(16).slice(2, 6);
  return `run_${Date.now()}_${hash}`;
}

// This server's own operational env vars (PORT, MONGODB_URI, CLIENT_ORIGIN,
// ...) use the exact same names Provisio's server/client expect for
// themselves. Spreading process.env into the spawned Playwright process
// unchanged leaks this server's PORT into Provisio's local webServer, which
// then tries to bind that same port — already held by this process — fails
// silently, and Playwright times out waiting on the *real* port that never
// came up. Stripping this server's own keys before spreading avoids that.
const OWN_ENV_KEYS = [
  "PORT",
  "MONGODB_URI",
  "CLIENT_ORIGIN",
  "PROVISIO_E2E_PATH",
  "PROVISIO_LOCAL_HEALTH_URL",
  "PROVISIO_LIVE_HEALTH_URL",
  "HEALTH_TIMEOUT_MS",
];

function buildChildEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  const base = { ...process.env };
  for (const key of OWN_ENV_KEYS) delete base[key];
  return { ...base, ...overrides };
}

// Killing a `shell: true` child only kills the shell wrapper, not the
// Playwright/browser processes it launched underneath — the process tree
// needs to go, not just the immediate child. Windows and POSIX need
// different mechanisms for that.
function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  if (process.platform === "win32") {
    exec(`taskkill /pid ${child.pid} /T /F`);
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

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

function collectFailedFiles(suites: PlaywrightJsonSuite[] | undefined, failed: Set<string>): void {
  if (!suites) return;
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      if (!spec.ok) failed.add(spec.file);
    }
    collectFailedFiles(suite.suites, failed);
  }
}

async function parseJsonReport(filePath: string): Promise<{ counts: RunCounts; failedFiles: string[] } | null> {
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
    // Missing/unparseable JSON (e.g. the process crashed before any reporter
    // could write it) — the caller falls back to exit-code-only status.
    return null;
  }
}

export async function startRun(config: StartRunConfig, io: Server): Promise<{ runId: string }> {
  const runId = generateRunId();
  const startedAt = new Date();

  io.sockets.sockets.get(config.socketId)?.join(roomFor(runId));

  await createRun({
    runId,
    specIds: config.specIds,
    environment: config.environment,
    headless: config.headless,
    startedAt,
  });

  const startedEvent: RunStartedEvent = {
    runId,
    specIds: config.specIds,
    specCount: config.specIds.length,
    environment: config.environment,
    headless: config.headless,
    startedAt: startedAt.toISOString(),
  };
  io.to(roomFor(runId)).emit("run:started", startedEvent);

  // Runs concurrently with the actual test run, not before it — awaited
  // only once the run finishes, so it never adds to the run's duration.
  const healthPromise = checkEnvironmentHealth(config.environment);

  const specs = await discoverSpecs();
  const specFileNames = config.specIds
    .map((id) => specs.find((s) => s.id === id)?.fileName)
    .filter((f): f is string => Boolean(f));

  const runReportsDir = path.join(REPORTS_DIR, runId);
  await mkdir(runReportsDir, { recursive: true });
  const jsonOutputPath = path.join(runReportsDir, "results.json");

  const args = ["playwright", "test", ...specFileNames];
  if (!config.headless) args.push("--headed");
  // Explicit reporter list: global-setup's own console output also goes to
  // stdout, so the JSON reporter is redirected to its own file via
  // PLAYWRIGHT_JSON_OUTPUT_NAME below rather than mixed into stdout, where
  // it would be unparseable alongside everything else sharing that stream.
  args.push("--reporter=list,json,html");

  const child = spawn("npx", args, {
    cwd: env.provisioE2ePath,
    shell: true,
    // Makes the child the leader of its own process group on POSIX, so
    // killProcessTree can signal the whole group instead of just this
    // one shell-wrapper process.
    detached: process.platform !== "win32",
    env: buildChildEnv({
      TARGET_ENV: config.environment,
      FORCE_COLOR: "1",
      PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOutputPath,
    }),
  });

  const activeRun: ActiveRun = {
    child,
    startedAt: Date.now(),
    environment: config.environment,
    specCount: config.specIds.length,
    cancelled: false,
  };
  activeRuns.set(runId, activeRun);

  let outputBuffer = "";

  function streamChunk(type: "stdout" | "stderr") {
    return (data: Buffer) => {
      const text = data.toString();
      outputBuffer += text;
      const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
      for (const line of lines) {
        const event: RunOutputEvent = { runId, line, type };
        io.to(roomFor(runId)).emit("run:output", event);
      }
    };
  }
  child.stdout?.on("data", streamChunk("stdout"));
  child.stderr?.on("data", streamChunk("stderr"));

  child.on("close", async (exitCode) => {
    const cancelled = activeRuns.get(runId)?.cancelled ?? false;
    activeRuns.delete(runId);

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const health = await healthPromise;

    const parsed = await parseJsonReport(jsonOutputPath);
    const counts: RunCounts = parsed?.counts ?? {
      passed: 0,
      failed: exitCode === 0 ? 0 : 1,
      skipped: 0,
      flaky: 0,
    };
    const failedSpecCount = parsed?.failedFiles.length ?? (exitCode === 0 ? 0 : specFileNames.length);

    const noTestsRan = counts.passed === 0 && counts.failed === 0 && counts.skipped === 0;

    let status: RunStatus;
    if (cancelled) status = "cancelled";
    else if (counts.failed > 0) status = "failed";
    // A nonzero exit with zero tests recorded anywhere means the process
    // died before any test could run — e.g. the local webServer never came
    // up. The JSON reporter's counts are all zero in that case too, which
    // would otherwise silently read as "passed".
    else if (exitCode !== 0 && noTestsRan) status = "failed";
    else if (counts.passed === 0 && counts.skipped > 0) status = "skipped";
    else status = "passed";

    let failureAnalysis: FailureAnalysis | undefined;
    if (status === "failed") {
      failureAnalysis = classifyFailure({
        output: outputBuffer,
        specCount: specFileNames.length,
        failedSpecCount,
        counts,
        health,
      });
    }

    const hasReport = await archiveReport(runId);

    await completeRun(runId, {
      status,
      completedAt,
      durationMs,
      exitCode: exitCode ?? -1,
      counts,
      failureAnalysis,
      healthProbe: health,
      hasReport,
    });

    const completedEvent: RunCompletedEvent = {
      runId,
      exitCode: exitCode ?? -1,
      durationMs,
      status,
      counts,
      hasReport,
      failureAnalysis,
      healthProbe: health,
    };
    io.to(roomFor(runId)).emit("run:completed", completedEvent);
  });

  return { runId };
}

export function stopRun(runId: string): boolean {
  const entry = activeRuns.get(runId);
  if (!entry) return false;
  entry.cancelled = true;
  killProcessTree(entry.child);
  return true;
}

export function getActiveRuns(): Array<{
  runId: string;
  environment: Environment;
  specCount: number;
  startedAt: string;
}> {
  return [...activeRuns.entries()].map(([runId, entry]) => ({
    runId,
    environment: entry.environment,
    specCount: entry.specCount,
    startedAt: new Date(entry.startedAt).toISOString(),
  }));
}
