import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import type { RunCompletedEvent, RunOutputEvent, RunStartedEvent } from "../types";

export interface OutputLine {
  type: "stdout" | "stderr";
  line: string;
}

interface UseRunStreamResult {
  runId: string | null;
  isRunning: boolean;
  output: OutputLine[];
  lastResult: RunCompletedEvent | null;
  reset: () => void;
}

/**
 * Listens for this run's Socket.io events. Listeners are registered once on
 * mount — not when a run starts — so a `run:started` that arrives in the
 * instant between the POST /api/runs/start response and attaching a listener
 * can never be missed. Which run is "ours" is tracked via a ref (not state)
 * so the output/completed handlers always see the current run id rather
 * than whatever it was when the closure was created.
 */
export function useRunStream(): UseRunStreamResult {
  const { socket } = useSocket();
  const [runId, setRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [lastResult, setLastResult] = useState<RunCompletedEvent | null>(null);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    function handleStarted(evt: RunStartedEvent): void {
      runIdRef.current = evt.runId;
      setRunId(evt.runId);
      setIsRunning(true);
      setOutput([]);
      setLastResult(null);
    }

    function handleOutput(evt: RunOutputEvent): void {
      if (evt.runId !== runIdRef.current) return;
      setOutput((prev) => [...prev, { type: evt.type, line: evt.line }]);
    }

    function handleCompleted(evt: RunCompletedEvent): void {
      if (evt.runId !== runIdRef.current) return;
      setIsRunning(false);
      setLastResult(evt);
    }

    socket.on("run:started", handleStarted);
    socket.on("run:output", handleOutput);
    socket.on("run:completed", handleCompleted);

    return () => {
      socket.off("run:started", handleStarted);
      socket.off("run:output", handleOutput);
      socket.off("run:completed", handleCompleted);
    };
  }, [socket]);

  const reset = useCallback(() => {
    runIdRef.current = null;
    setRunId(null);
    setIsRunning(false);
    setOutput([]);
    setLastResult(null);
  }, []);

  return { runId, isRunning, output, lastResult, reset };
}
