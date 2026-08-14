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
};
