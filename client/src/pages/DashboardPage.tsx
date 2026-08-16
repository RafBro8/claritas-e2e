import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Play, RefreshCw, Square } from "lucide-react";
import { listSpecs } from "../api/specs";
import { startRun, stopRun } from "../api/runs";
import { ApiError } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import { useRunStream } from "../hooks/useRunStream";
import { EnvironmentSelector } from "../components/dashboard/EnvironmentSelector";
import { BrowserModeToggle } from "../components/dashboard/BrowserModeToggle";
import { SpecChecklist } from "../components/dashboard/SpecChecklist";
import { LiveOutput } from "../components/dashboard/LiveOutput";
import { RunResultSummary } from "../components/dashboard/RunResultSummary";
import type { Environment, Spec } from "../types";

export function DashboardPage() {
  const { socket } = useSocket();
  const { showToast } = useToast();
  const { runId, isRunning, output, lastResult, reset } = useRunStream();

  const [specs, setSpecs] = useState<Spec[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [environment, setEnvironment] = useState<Environment>("local");
  const [headless, setHeadless] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const loadSpecs = useCallback(async () => {
    setIsLoadingSpecs(true);
    try {
      const res = await listSpecs();
      setSpecs(res.specs);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't load specs", "error");
    } finally {
      setIsLoadingSpecs(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.status === "passed") showToast("Run passed", "success");
    else if (lastResult.status === "failed") showToast("Run failed", "error");
    else if (lastResult.status === "cancelled") showToast("Run cancelled", "info");
    else if (lastResult.status === "skipped") showToast("Run skipped — no matching tests ran", "info");
  }, [lastResult, showToast]);

  function toggleSpec(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(): void {
    setSelectedIds(new Set(specs.map((s) => s.id)));
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  async function handleRun(): Promise<void> {
    if (selectedIds.size === 0) {
      showToast("Select at least one spec first", "info");
      return;
    }
    setIsStarting(true);
    try {
      reset();
      await startRun({
        specIds: [...selectedIds],
        environment,
        headless,
        socketId: socket.id ?? "",
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't start the run", "error");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleStop(): Promise<void> {
    if (!runId) return;
    try {
      await stopRun(runId);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't stop the run", "error");
    }
  }

  const disabled = isRunning || isStarting;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-950 p-2">
            <FlaskConical className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-400">Select an environment, choose your specs, and run.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadSpecs}
          disabled={isLoadingSpecs}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-8 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <EnvironmentSelector value={environment} onChange={setEnvironment} disabled={disabled} />
        <BrowserModeToggle headless={headless} onChange={setHeadless} disabled={disabled} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <SpecChecklist
          specs={specs}
          isLoading={isLoadingSpecs}
          selectedIds={selectedIds}
          onToggle={toggleSpec}
          onSelectAll={selectAll}
          onClear={clearSelection}
          disabled={disabled}
        />
      </div>

      <LiveOutput lines={output} />

      {lastResult && <RunResultSummary result={lastResult} />}

      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
        <span className="text-sm text-slate-400">
          {selectedIds.size} spec{selectedIds.size === 1 ? "" : "s"} selected · {environment === "local" ? "Local" : "Live"} ·{" "}
          {headless ? "Headless" : "Headed"}
        </span>
        {isRunning ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRun}
            disabled={isStarting || selectedIds.size === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {isStarting ? "Starting…" : "Run Selected"}
          </button>
        )}
      </div>
    </div>
  );
}
