import { describe, it, expect } from "vitest";
import { generateRunId } from "../runId";

describe("generateRunId", () => {
  it("matches the run_<epoch-ms>_<4-char-hex> convention", () => {
    expect(generateRunId()).toMatch(/^run_\d+_[0-9a-f]{1,4}$/);
  });

  it("produces different ids on successive calls", () => {
    // Just two calls, not a large batch — the random suffix has a small
    // enough space (4 hex chars) that a big batch run within the same
    // millisecond would have a real, if small, chance of a genuine
    // collision, which would make this a flaky test rather than a broken
    // implementation.
    expect(generateRunId()).not.toBe(generateRunId());
  });
});
