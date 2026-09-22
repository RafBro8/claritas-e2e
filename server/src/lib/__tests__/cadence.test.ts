import { describe, it, expect } from "vitest";
import { cadenceToCron, describeCadence, nextRuns, validateCadence, isValidTimeZone } from "../cadence";

describe("cadenceToCron", () => {
  it("turns each friendly cadence into the equivalent cron expression", () => {
    expect(cadenceToCron({ type: "hourly", minute: 41 })).toBe("41 * * * *");
    expect(cadenceToCron({ type: "daily", minute: 0, hour: 9 })).toBe("0 9 * * *");
    expect(cadenceToCron({ type: "weekdays", minute: 30, hour: 7 })).toBe("30 7 * * 1-5");
    expect(cadenceToCron({ type: "weekly", minute: 0, hour: 18, dayOfWeek: 5 })).toBe("0 18 * * 5");
  });

  it("passes a custom expression through untouched", () => {
    expect(cadenceToCron({ type: "custom", expression: "*/15 9-17 * * 1-5" })).toBe("*/15 9-17 * * 1-5");
  });
});

describe("describeCadence", () => {
  it("describes each cadence the way the UI shows it", () => {
    expect(describeCadence({ type: "hourly", minute: 5 })).toBe("Every hour at :05");
    expect(describeCadence({ type: "daily", minute: 0, hour: 9 })).toBe("Every day at 09:00");
    expect(describeCadence({ type: "weekdays", minute: 30, hour: 7 })).toBe("Every weekday at 07:30");
    expect(describeCadence({ type: "weekly", minute: 0, hour: 18, dayOfWeek: 5 })).toBe("Every Friday at 18:00");
    expect(describeCadence({ type: "custom", expression: "0 9 * * 1" })).toBe("Custom schedule (0 9 * * 1)");
  });
});

describe("validateCadence", () => {
  it("accepts well-formed cadences", () => {
    expect(validateCadence({ type: "hourly", minute: 0 })).toBeNull();
    expect(validateCadence({ type: "weekly", minute: 0, hour: 9, dayOfWeek: 0 })).toBeNull();
    expect(validateCadence({ type: "custom", expression: "*/5 * * * *" })).toBeNull();
  });

  it("explains what's wrong with a bad one", () => {
    expect(validateCadence(null)).toMatch(/cadence is required/i);
    expect(validateCadence({ type: "yearly" })).toMatch(/hourly, daily/i);
    expect(validateCadence({ type: "hourly", minute: 60 })).toMatch(/minute/i);
    expect(validateCadence({ type: "daily", minute: 0, hour: 24 })).toMatch(/hour/i);
    expect(validateCadence({ type: "weekly", minute: 0, hour: 9 })).toMatch(/day of the week/i);
    expect(validateCadence({ type: "custom", expression: "not a cron" })).toMatch(/valid cron/i);
    expect(validateCadence({ type: "custom", expression: "  " })).toMatch(/required/i);
  });
});

describe("nextRuns", () => {
  const from = new Date("2026-03-04T12:00:00.000Z"); // a Wednesday

  it("reads the cadence in the schedule's own timezone, not the server's", () => {
    // 4 March is still standard time in Chicago (UTC-6), so 09:00 there is 15:00 UTC.
    const [winter] = nextRuns({ type: "daily", minute: 0, hour: 9 }, "America/Chicago", 1, from);
    expect(winter.toISOString()).toBe("2026-03-04T15:00:00.000Z");

    // The same 09:00 in July is 14:00 UTC, because Chicago is on daylight
    // time by then - the wall-clock time the author picked doesn't drift.
    const [summer] = nextRuns({ type: "daily", minute: 0, hour: 9 }, "America/Chicago", 1, new Date("2026-07-01T12:00:00.000Z"));
    expect(summer.toISOString()).toBe("2026-07-01T14:00:00.000Z");

    // The same cadence in Tokyo is the following morning there.
    const [tokyo] = nextRuns({ type: "daily", minute: 0, hour: 9 }, "Asia/Tokyo", 1, from);
    expect(tokyo.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("returns consecutive occurrences, skipping the weekend for weekdays", () => {
    const runs = nextRuns({ type: "weekdays", minute: 0, hour: 9 }, "UTC", 4, new Date("2026-03-06T12:00:00.000Z"));
    expect(runs.map((d) => d.toISOString())).toEqual([
      "2026-03-09T09:00:00.000Z", // Monday - Friday's 09:00 has already passed
      "2026-03-10T09:00:00.000Z",
      "2026-03-11T09:00:00.000Z",
      "2026-03-12T09:00:00.000Z",
    ]);
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects anything else", () => {
    expect(isValidTimeZone("America/Chicago")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});
