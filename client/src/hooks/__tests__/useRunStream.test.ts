import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRunStream } from "../useRunStream";
import type { RunCompletedEvent, RunOutputEvent, RunStartedEvent } from "../../types";

// A real SocketContext creates a real socket.io-client connection at module
// scope, which would try to actually reach a server during a unit test.
// This fake is a minimal event emitter with the same on/off/trigger shape,
// giving full control over firing "server-pushed" events without any
// network activity.
const { fakeSocket } = vi.hoisted(() => {
  class FakeSocket {
    listeners: Record<string, Array<(payload: unknown) => void>> = {};
    on(event: string, handler: (payload: unknown) => void): void {
      (this.listeners[event] ??= []).push(handler);
    }
    off(event: string, handler: (payload: unknown) => void): void {
      this.listeners[event] = (this.listeners[event] ?? []).filter((h) => h !== handler);
    }
    trigger(event: string, payload: unknown): void {
      for (const handler of [...(this.listeners[event] ?? [])]) handler(payload);
    }
  }
  return { fakeSocket: new FakeSocket() };
});

vi.mock("../../context/SocketContext", () => ({
  useSocket: () => ({ socket: fakeSocket, connected: true }),
}));

function startedEvent(overrides: Partial<RunStartedEvent> = {}): RunStartedEvent {
  return {
    runId: "run_a",
    specIds: ["auth"],
    specCount: 1,
    environment: "local",
    headless: true,
    startedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function outputEvent(overrides: Partial<RunOutputEvent> = {}): RunOutputEvent {
  return { runId: "run_a", line: "some output", type: "stdout", ...overrides };
}

function completedEvent(overrides: Partial<RunCompletedEvent> = {}): RunCompletedEvent {
  return {
    runId: "run_a",
    exitCode: 0,
    durationMs: 1000,
    status: "passed",
    counts: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
    hasReport: true,
    ...overrides,
  };
}

describe("useRunStream", () => {
  beforeEach(() => {
    fakeSocket.listeners = {};
  });

  it("starts with an empty, idle state", () => {
    const { result } = renderHook(() => useRunStream());

    expect(result.current.runId).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.output).toEqual([]);
    expect(result.current.lastResult).toBeNull();
  });

  it("adopts a run on run:started and marks it running", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent()));

    expect(result.current.runId).toBe("run_a");
    expect(result.current.isRunning).toBe(true);
    expect(result.current.output).toEqual([]);
    expect(result.current.lastResult).toBeNull();
  });

  it("appends output lines for the active run, in order", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent()));
    act(() => fakeSocket.trigger("run:output", outputEvent({ line: "first" })));
    act(() => fakeSocket.trigger("run:output", outputEvent({ line: "second", type: "stderr" })));

    expect(result.current.output).toEqual([
      { type: "stdout", line: "first" },
      { type: "stderr", line: "second" },
    ]);
  });

  it("ignores output events for a run other than the currently active one", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent({ runId: "run_a" })));
    act(() => fakeSocket.trigger("run:output", outputEvent({ runId: "run_b", line: "not mine" })));

    expect(result.current.output).toEqual([]);
  });

  it("ignores a completed event for a run other than the currently active one", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent({ runId: "run_a" })));
    act(() => fakeSocket.trigger("run:completed", completedEvent({ runId: "run_b" })));

    expect(result.current.isRunning).toBe(true);
    expect(result.current.lastResult).toBeNull();
  });

  it("marks the run finished and stores the result on a matching run:completed", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent()));
    const completed = completedEvent({ status: "failed" });
    act(() => fakeSocket.trigger("run:completed", completed));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.lastResult).toEqual(completed);
  });

  it("clears output and the previous result when a new run starts", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent({ runId: "run_a" })));
    act(() => fakeSocket.trigger("run:output", outputEvent({ runId: "run_a" })));
    act(() => fakeSocket.trigger("run:completed", completedEvent({ runId: "run_a" })));
    expect(result.current.output).toHaveLength(1);
    expect(result.current.lastResult).not.toBeNull();

    act(() => fakeSocket.trigger("run:started", startedEvent({ runId: "run_b" })));

    expect(result.current.runId).toBe("run_b");
    expect(result.current.isRunning).toBe(true);
    expect(result.current.output).toEqual([]);
    expect(result.current.lastResult).toBeNull();

    // And output for the new run is correctly attributed, not filtered out
    // by a stale runId reference.
    act(() => fakeSocket.trigger("run:output", outputEvent({ runId: "run_b", line: "for the new run" })));
    expect(result.current.output).toEqual([{ type: "stdout", line: "for the new run" }]);
  });

  it("reset() clears back to the initial idle state", () => {
    const { result } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent()));
    act(() => fakeSocket.trigger("run:completed", completedEvent()));
    act(() => result.current.reset());

    expect(result.current.runId).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.output).toEqual([]);
    expect(result.current.lastResult).toBeNull();
  });

  it("stops responding to a run's events after unmount", () => {
    const { result, unmount } = renderHook(() => useRunStream());

    act(() => fakeSocket.trigger("run:started", startedEvent()));
    unmount();

    // Should not throw, and should have no effect on anything observable —
    // mainly confirms socket.off actually ran during cleanup.
    expect(() => fakeSocket.trigger("run:output", outputEvent())).not.toThrow();
    expect(result.current.output).toEqual([]);
  });
});
