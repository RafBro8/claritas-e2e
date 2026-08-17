import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatDuration, formatRelativeOrDate } from "../format";

describe("formatDuration", () => {
  it("renders sub-minute durations in seconds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45_000)).toBe("45s");
  });

  it("renders durations of a minute or more as Nm Ns", () => {
    expect(formatDuration(60_000)).toBe("1m 0s");
    expect(formatDuration(90_000)).toBe("1m 30s");
    expect(formatDuration(3_723_000)).toBe("62m 3s");
  });

  it("rounds to the nearest second", () => {
    expect(formatDuration(1_499)).toBe("1s");
    expect(formatDuration(1_500)).toBe("2s");
  });
});

describe("formatRelativeOrDate", () => {
  const NOW = new Date("2026-06-15T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for anything under a minute old", () => {
    expect(formatRelativeOrDate(new Date(NOW.getTime() - 30_000).toISOString())).toBe("just now");
  });

  it("returns minutes ago for under an hour old", () => {
    expect(formatRelativeOrDate(new Date(NOW.getTime() - 5 * 60_000).toISOString())).toBe("5m ago");
  });

  it("returns hours ago for under a day old", () => {
    expect(formatRelativeOrDate(new Date(NOW.getTime() - 3 * 60 * 60_000).toISOString())).toBe("3h ago");
  });

  it("returns days ago for under a week old", () => {
    expect(formatRelativeOrDate(new Date(NOW.getTime() - 2 * 24 * 60 * 60_000).toISOString())).toBe("2d ago");
  });

  it("falls back to a plain date for a week or older", () => {
    const eightDaysAgo = new Date(NOW.getTime() - 8 * 24 * 60 * 60_000);
    expect(formatRelativeOrDate(eightDaysAgo.toISOString())).toBe(eightDaysAgo.toLocaleDateString());
  });
});
