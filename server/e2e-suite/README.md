> **Bundled snapshot.** This folder is a committed copy of [Provisio](https://github.com/RafBro8/provisio)'s `e2e/` directory, kept here so claritas-e2e's deployed backend has a suite to actually run — Render's container doesn't have Provisio checked out alongside it. It's a manual snapshot, not a live link: re-copy from `provisio/e2e` (excluding `node_modules/`, `playwright-report/`, `test-results/`) after any change to Provisio's suite that this app should pick up. Local development still points `PROVISIO_E2E_PATH` at the real sibling Provisio checkout instead — this bundled copy is only used in production.

# provisio-e2e

Playwright end-to-end specs for [Provisio](../README.md) — driving a real headless Chromium against the real frontend, backend, and MongoDB. Nothing here is mocked.

## What's covered

- **auth.spec.ts** — register/login/logout through the real UI, and the redirect-to-login-then-back-to-the-original-page flow for protected routes.
- **booking-flow.spec.ts** — browse → search → select a service and slot → confirm → verify it shows up in My Bookings.
- **cancellation-policy.spec.ts** — cancelling ≥24h out is not flagged late; cancelling within 24h is.
- **provider-availability.spec.ts** — a provider configures working hours + a service through the dashboard, and the resulting availability grid is exactly correct (a 2-hour window with a 60-minute service must yield exactly 2 slots — a precise, timezone-agnostic assertion rather than eyeballing displayed clock times).
- **admin-override.spec.ts** — an admin cancels a booking that isn't theirs.
- **double-booking.spec.ts** — the flagship spec: two real browser contexts race to book the identical slot; asserts exactly one wins, both via the UI outcome and a direct API check that only one `booked` appointment exists.

Every spec logs its progress via `step()` (`tests/helpers/log.ts`) — plain `console.log`, deliberately not Playwright's own step/annotation APIs, since claritas-e2e (a separate companion project) streams raw stdout from `npx playwright test` to a non-technical viewer.

## Running locally

```bash
npm install
npx playwright install chromium   # first time only
npm test
```

That's it — `npm test` (`playwright test`) builds and starts both the backend and frontend as **production builds** (not `npm run dev`) automatically via Playwright's `webServer` config, waits for them to be healthy, seeds an admin account, and runs the suite. Requires Docker Mongo already running (`docker compose up -d` from the repo root).

## Design notes worth knowing

- **Separate database**: specs run against `provisio_e2e`, not whatever database your `server/.env` points at for everyday manual dev poking-around. The `webServer` config overrides `MONGODB_URI` for the spawned backend process specifically.
- **Production builds, not dev servers**: `npm run dev` (Vite/tsx's on-demand compilation) couldn't keep up under real concurrent load — genuine resource-contention timeouts, not flaky tests. Production builds are also literally what gets deployed (Phase 17), so this is closer to what's actually shipped.
- **Admin seeding**: admin accounts can't be created through the public API by design. `global-setup.ts` runs the project's real `npm run seed:admin` script (not a reimplementation) against the e2e database with throwaway test credentials.
- **API setup, UI verification**: registering accounts and setting up providers/services goes through direct API calls for speed (`tests/helpers/api.ts`) — the actual behavior under test is always driven through the real UI. The exception is `auth.spec.ts`, where registration/login *is* the thing being tested, so that goes through the UI end to end.
- **Parallelism is capped** (`workers: 4` locally, `2` in CI) rather than left to auto-detect CPU cores, and there's one retry everywhere (not just CI) to absorb a real, observed transient: a `webServer` that's just reported healthy can still drop the first wave of concurrent requests before it's fully warmed up. A genuine regression fails consistently even with a retry; this specific startup blip doesn't.
- **Unique test data**: specs run in parallel against one shared database (not per-test isolated like the backend's in-memory Mongo for Vitest), so anything matched via a UI list or search (provider names, mainly) uses `uniqueName()` to stay distinguishable from whatever other specs are creating at the same moment.
