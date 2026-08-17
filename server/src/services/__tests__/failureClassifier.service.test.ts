import { describe, it, expect } from "vitest";
import { classifyFailure } from "../failureClassifier.service";
import type { HealthProbe, RunCounts } from "../../types";

const NO_HEALTH_SIGNAL: HealthProbe = { ok: null, checkedAt: "2026-01-01T00:00:00.000Z" };
const HEALTH_DOWN: HealthProbe = { ok: false, checkedAt: "2026-01-01T00:00:00.000Z", error: "fetch failed" };
const ONE_FAILED: RunCounts = { passed: 0, failed: 1, skipped: 0, flaky: 0 };

describe("classifyFailure", () => {
  it("classifies a connection-refused error as environment with 60% confidence", () => {
    const result = classifyFailure({
      output: "Error: connect ECONNREFUSED 127.0.0.1:4000",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("environment");
    expect(result.confidence).toBe(0.6);
    expect(result.signals).toEqual(["Connection refused/reset — the server may have been unreachable"]);
  });

  it("classifies a missing-locator error as ui-change with 60% confidence", () => {
    const result = classifyFailure({
      output: "locator resolved to 0 elements",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("ui-change");
    expect(result.confidence).toBe(0.6);
    expect(result.signals).toEqual(["A locator didn't resolve to any element"]);
  });

  it("matches the real ECONNREFUSED + unhealthy-environment scenario observed manually (75% confidence)", () => {
    // This exact combination was produced by a real run: Provisio's local
    // MongoDB was stopped, its server crashed on boot, and the pre-flight
    // health probe (against the now-dead server) independently reported
    // unhealthy too — two separate signals agreeing.
    const result = classifyFailure({
      output: "MongooseServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017",
      specCount: 1,
      failedSpecCount: 1,
      counts: { passed: 0, failed: 0, skipped: 0, flaky: 0 },
      health: HEALTH_DOWN,
    });

    expect(result.category).toBe("environment");
    expect(result.confidence).toBe(0.75);
    expect(result.signals).toEqual([
      "Connection refused/reset — the server may have been unreachable",
      "The environment was unreachable or unhealthy before this run even started",
    ]);
  });

  it("treats every selected spec failing together as an environment signal (blast radius)", () => {
    const result = classifyFailure({
      output: "some completely unrecognized error text",
      specCount: 3,
      failedSpecCount: 3,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("environment");
    expect(result.confidence).toBe(0.5);
    expect(result.signals).toEqual([
      "Every selected spec failed together — points at the environment rather than one spec",
    ]);
  });

  it("treats exactly one failing spec among passing siblings as a ui-change signal (blast radius)", () => {
    const result = classifyFailure({
      output: "some completely unrecognized error text",
      specCount: 3,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("ui-change");
    expect(result.confidence).toBe(0.33);
    expect(result.signals).toEqual([
      "Only one spec failed while its siblings passed — points at that spec needing an update",
    ]);
  });

  it("does not apply blast-radius scoring when only one spec was selected", () => {
    const result = classifyFailure({
      output: "some completely unrecognized error text",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("short-circuits to unknown at 30% confidence when any test was flaky", () => {
    const result = classifyFailure({
      output: "some completely unrecognized error text",
      specCount: 1,
      failedSpecCount: 1,
      counts: { passed: 1, failed: 0, skipped: 0, flaky: 2 },
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("unknown");
    expect(result.confidence).toBe(0.3);
    expect(result.signals).toEqual(["2 test(s) passed on retry (flaky) — treat this result with caution"]);
  });

  it("does not consult the health probe when the run was flaky", () => {
    // The flaky check returns before the health.ok === false branch runs —
    // confirm the environment-down signal is NOT added in that case.
    const result = classifyFailure({
      output: "irrelevant",
      specCount: 1,
      failedSpecCount: 1,
      counts: { passed: 1, failed: 0, skipped: 0, flaky: 1 },
      health: HEALTH_DOWN,
    });

    expect(result.signals).not.toContain("The environment was unreachable or unhealthy before this run even started");
  });

  it("treats an unhealthy pre-flight probe alone as an environment signal", () => {
    const result = classifyFailure({
      output: "some completely unrecognized error text",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: HEALTH_DOWN,
    });

    expect(result.category).toBe("environment");
    expect(result.confidence).toBe(0.6);
    expect(result.signals).toEqual(["The environment was unreachable or unhealthy before this run even started"]);
  });

  it("returns unknown with no signals when nothing points anywhere", () => {
    const result = classifyFailure({
      output: "",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.signals).toEqual(["No clear signal in the output — worth a human look"]);
  });

  it("returns unknown at 20% confidence on a tied score between categories", () => {
    // "401 Unauthorized" (environment, weight 1) vs. the toHaveText
    // assertion pattern (ui-change, weight 1) — an even split.
    const result = classifyFailure({
      output: "Error: 401 Unauthorized\nexpect(locator).toHaveText('Welcome')",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("unknown");
    expect(result.confidence).toBe(0.2);
    expect(result.signals).toEqual(["Auth failure talking to the app", "A visible-content assertion failed"]);
  });

  it("still matches signals through ANSI color codes", () => {
    const result = classifyFailure({
      output: "\x1b[31mECONNREFUSED\x1b[0m at somewhere",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("environment");
    expect(result.signals).toContain("Connection refused/reset — the server may have been unreachable");
  });

  it("recognizes a webServer startup timeout as an environment issue", () => {
    const result = classifyFailure({
      output: "Error: Timed out waiting 60000ms from config.webServer.",
      specCount: 1,
      failedSpecCount: 1,
      counts: { passed: 0, failed: 0, skipped: 0, flaky: 0 },
      health: NO_HEALTH_SIGNAL,
    });

    expect(result.category).toBe("environment");
    expect(result.signals).toContain("The local dev server never became healthy in time");
  });

  it("accumulates weight across multiple matching rules in the same category", () => {
    const result = classifyFailure({
      output: "net::ERR_CONNECTION_REFUSED and also ECONNREFUSED",
      specCount: 1,
      failedSpecCount: 1,
      counts: ONE_FAILED,
      health: NO_HEALTH_SIGNAL,
    });

    // weight 3 (net::ERR_) + weight 3 (ECONNREFUSED) = 6 → 6 / (6 + 2) = 0.75
    expect(result.category).toBe("environment");
    expect(result.confidence).toBe(0.75);
    expect(result.signals).toHaveLength(2);
  });
});
