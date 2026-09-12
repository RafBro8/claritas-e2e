import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildRunReportEmail, isEmailConfigured, resetEmailTransport, sendRunReportEmail } from "../email.service";
import { env } from "../../config/env";

const BASE_REPORT = {
  to: "team@example.com",
  scheduleName: "Weekday smoke",
  runId: "run_123",
  status: "passed" as const,
  environment: "live" as const,
  specCount: 3,
  durationMs: 95_000,
  counts: { passed: 9, failed: 0, skipped: 0, flaky: 1 },
  hasReport: true,
};

const original = { ...env };

afterEach(() => {
  Object.assign(env, original);
  resetEmailTransport();
  vi.restoreAllMocks();
});

describe("isEmailConfigured", () => {
  it("is false until host, user and password are all set", () => {
    Object.assign(env, { smtpHost: "", smtpUser: "", smtpPass: "" });
    expect(isEmailConfigured()).toBe(false);

    Object.assign(env, { smtpHost: "smtp.example.com", smtpUser: "", smtpPass: "" });
    expect(isEmailConfigured()).toBe(false);

    Object.assign(env, { smtpHost: "smtp.example.com", smtpUser: "me", smtpPass: "secret" });
    expect(isEmailConfigured()).toBe(true);
  });
});

describe("buildRunReportEmail", () => {
  beforeEach(() => {
    Object.assign(env, { publicUrl: "https://api.example.com" });
  });

  it("summarises the run in the subject and body", () => {
    const { subject, text } = buildRunReportEmail(BASE_REPORT);

    expect(subject).toBe("Weekday smoke: 3 specs passed");
    expect(text).toContain("Environment: Live");
    expect(text).toContain("Duration: 1m 35s");
    expect(text).toContain("Tests: 9 passed, 0 failed, 0 skipped, 1 flaky");
    expect(text).toContain("https://api.example.com/api/reports/run_123/html/index.html");
  });

  it("says what actually happened when a run fails", () => {
    const { subject } = buildRunReportEmail({ ...BASE_REPORT, status: "failed", specCount: 1 });
    expect(subject).toBe("Weekday smoke: 1 spec failed");
  });

  it("leaves out the report link when there's no archived report", () => {
    const { text } = buildRunReportEmail({ ...BASE_REPORT, hasReport: false });
    expect(text).not.toContain("Full report");
  });
});

describe("sendRunReportEmail", () => {
  it("skips, without error, when the schedule has no address", async () => {
    Object.assign(env, { smtpHost: "smtp.example.com", smtpUser: "me", smtpPass: "secret" });

    const result = await sendRunReportEmail({ ...BASE_REPORT, to: "" });

    expect(result.status).toBe("skipped");
    expect(result.detail).toMatch(/no email address/i);
  });

  it("skips, without error, when the server has no SMTP settings", async () => {
    Object.assign(env, { smtpHost: "", smtpUser: "", smtpPass: "" });

    const result = await sendRunReportEmail(BASE_REPORT);

    expect(result.status).toBe("skipped");
    expect(result.detail).toMatch(/isn't configured/i);
  });

  it("reports a send failure instead of throwing, so a bad mail server can't fail the run", async () => {
    Object.assign(env, { smtpHost: "127.0.0.1", smtpPort: 1, smtpUser: "me", smtpPass: "secret" });

    const result = await sendRunReportEmail(BASE_REPORT);

    expect(result.status).toBe("failed");
    expect(result.detail).toBeTruthy();
  });
});
