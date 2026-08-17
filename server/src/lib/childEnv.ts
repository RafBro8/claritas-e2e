// This server's own operational env vars (PORT, MONGODB_URI, CLIENT_ORIGIN,
// ...) use the exact same names Provisio's server/client expect for
// themselves. Spreading process.env into the spawned Playwright process
// unchanged leaks this server's PORT into Provisio's local webServer, which
// then tries to bind that same port — already held by this process — fails
// silently, and Playwright times out waiting on the *real* port that never
// came up. Stripping this server's own keys before spreading avoids that.
export const OWN_ENV_KEYS = [
  "PORT",
  "MONGODB_URI",
  "CLIENT_ORIGIN",
  "PROVISIO_E2E_PATH",
  "PROVISIO_LOCAL_HEALTH_URL",
  "PROVISIO_LIVE_HEALTH_URL",
  "HEALTH_TIMEOUT_MS",
];

export function buildChildEnv(
  overrides: Record<string, string>,
  sourceEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const base = { ...sourceEnv };
  for (const key of OWN_ENV_KEYS) delete base[key];
  return { ...base, ...overrides };
}
