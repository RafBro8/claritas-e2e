import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";
import type { Environment, RunCounts, RunStatus, ScheduleLastEmail } from "../types";

export interface RunReportEmail {
  to: string;
  scheduleName: string;
  runId: string;
  status: RunStatus;
  environment: Environment;
  specCount: number;
  durationMs: number;
  counts?: RunCounts;
  hasReport: boolean;
}

/**
 * Email is optional. Until SMTP settings are configured the app behaves
 * exactly as it did before: schedules run, and each report is recorded as
 * "skipped" with the reason, which the UI shows. Any SMTP provider works —
 * a Gmail app password, Resend, Mailgun — so the choice can be made later
 * without touching this code.
 */
export function isEmailConfigured(): boolean {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

let cachedTransporter: Transporter | null = null;

function transporter(): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      // 465 is implicit TLS; 587 and others upgrade with STARTTLS.
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  return cachedTransporter;
}

/** Exposed for tests, which swap SMTP settings between cases. */
export function resetEmailTransport(): void {
  cachedTransporter = null;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function buildRunReportEmail(report: RunReportEmail): { subject: string; text: string } {
  const outcome = report.status === "passed" ? "passed" : report.status;
  const subject = `${report.scheduleName}: ${report.specCount} spec${report.specCount === 1 ? "" : "s"} ${outcome}`;

  const lines = [
    `Schedule: ${report.scheduleName}`,
    `Result: ${outcome}`,
    `Environment: ${report.environment === "live" ? "Live" : "Local"}`,
    `Specs: ${report.specCount}`,
    `Duration: ${formatDuration(report.durationMs)}`,
  ];
  if (report.counts) {
    lines.push(
      `Tests: ${report.counts.passed} passed, ${report.counts.failed} failed, ${report.counts.skipped} skipped, ${report.counts.flaky} flaky`,
    );
  }
  if (report.hasReport && env.publicUrl) {
    lines.push("", `Full report: ${env.publicUrl}/api/reports/${report.runId}/html/index.html`);
  }
  lines.push("", `Run id: ${report.runId}`, "", "Sent by Claritas E2E.");

  return { subject, text: lines.join("\n") };
}

/**
 * Never throws: a schedule's job is to run tests, and a mail server having a
 * bad day shouldn't turn a passing run into a failure. The outcome is
 * returned so it can be shown on the schedule instead.
 */
export async function sendRunReportEmail(report: RunReportEmail): Promise<ScheduleLastEmail> {
  const at = new Date().toISOString();

  if (!report.to) return { status: "skipped", at, detail: "No email address on this schedule" };
  if (!isEmailConfigured()) return { status: "skipped", at, detail: "Email isn't configured on the server yet" };

  const { subject, text } = buildRunReportEmail(report);

  try {
    await transporter().sendMail({
      from: env.mailFrom || env.smtpUser,
      to: report.to,
      subject,
      text,
    });
    return { status: "sent", at, detail: report.to };
  } catch (err) {
    return { status: "failed", at, detail: err instanceof Error ? err.message : "Sending failed" };
  }
}
