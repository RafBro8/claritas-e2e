import { defineConfig, devices } from "@playwright/test";
import { FRONTEND_URL, BACKEND_URL, E2E_MONGODB_URI } from "./tests/helpers/constants";

const TARGET_ENV = process.env.TARGET_ENV === "live" ? "live" : "local";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Each spec drives a real headless Chromium instance. Left unbounded,
  // Playwright defaults to one worker per CPU core, which caused genuine
  // resource-contention timeouts here (not flaky tests — the servers
  // couldn't keep up with 9 concurrent browsers). Capped for a reliable
  // default; a beefier machine can override with `--workers=N`.
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  // One retry everywhere, not just CI: a webServer that has *just* reported
  // healthy can still drop the very first wave of concurrent requests
  // before it's fully warmed up (a real, observed transient — a genuine
  // startup-timing artifact, not flaky test logic). One retry absorbs that
  // without masking an actual regression, which would fail consistently.
  retries: process.env.CI ? 2 : 1,
  // "list" for live console output; "html" so CI has something real to
  // upload as an artifact (an empty reporter list means a failure's
  // trace/screenshots are only ever visible in the raw log, not inspectable
  // from the Actions UI).
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: require.resolve("./global-setup.ts"),
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Deliberately production builds, not `npm run dev` — running specs
  // against Vite/tsx's on-demand dev-mode compilation under real concurrent
  // load caused genuine resource-contention timeouts (not flaky tests; the
  // servers just couldn't keep up). Production builds are also what Phase 17
  // actually deploys, so this is closer to what's really being shipped.
  //
  // Only started for the local target — TARGET_ENV=live points FRONTEND_URL/
  // BACKEND_URL at the real deployed Vercel/Render URLs instead, so there's
  // nothing local to spin up.
  webServer:
    TARGET_ENV === "local"
      ? [
          {
            command: "npm run build && npm start",
            cwd: "../server",
            url: `${BACKEND_URL}/api/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            env: { MONGODB_URI: E2E_MONGODB_URI },
          },
          {
            command: "npm run build && npm run preview -- --port 5173 --strictPort",
            cwd: "../client",
            url: FRONTEND_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        ]
      : undefined,
});
