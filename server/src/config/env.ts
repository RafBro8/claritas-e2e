import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4001),
  mongoUri: required("MONGODB_URI"),
  clientOrigin: required("CLIENT_ORIGIN"),
  provisioE2ePath: required("PROVISIO_E2E_PATH"),
  // Pre-flight health-check targets. Left blank, the corresponding check is
  // simply skipped (HealthProbe.ok === null) rather than treated as a failure.
  provisioLocalHealthUrl: process.env.PROVISIO_LOCAL_HEALTH_URL || "",
  provisioLiveHealthUrl: process.env.PROVISIO_LIVE_HEALTH_URL || "",
  healthTimeoutMs: Number(process.env.HEALTH_TIMEOUT_MS ?? 8000),
  // Email for scheduled-run reports. Any SMTP provider works (a Gmail app
  // password, Resend, Mailgun...). Left unset, the app runs exactly as
  // before and simply records each report email as skipped instead of
  // failing a run over it.
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "",
  /** This API's own public URL, used to build report links inside emails. */
  publicUrl: process.env.PUBLIC_URL || "",
};
