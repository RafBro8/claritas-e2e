# Tech stack

This is the developer-facing companion to [README.md](README.md) (the plain-English product overview). It explains what Claritas E2E is built with, how the pieces fit together, and — where relevant — what real problems shaped a decision, since several of them came from actually deploying this thing, not just designing it on paper.

## High-level architecture

Two processes, talking over both REST and WebSockets:

```
React SPA (Vite)  --REST /api/*-->  Express API  --spawns-->  npx playwright test
      ^                                   |                         |
      |                              MongoDB (Mongoose)         stdout/stderr
      |                                   |                         |
      +------------ Socket.io (per-run room) <---------------------+
```

The backend spawns a real Playwright process against a real target app — nothing is mocked. The frontend never touches Playwright, the filesystem, or Mongo directly; everything goes through the backend's REST/Socket.io API.

## Repository layout

```
claritas-e2e/
├── README.md                 # non-technical product overview
├── Tech-Stack.md              # this file
├── render.yaml                 # Render Blueprint (backend)
├── docker-compose.yml           # local MongoDB for dev
├── server/                       # Express + Socket.io backend
│   ├── src/
│   │   ├── server.ts               # http.Server + Socket.io + Express wiring
│   │   ├── app.ts                   # Express app factory
│   │   ├── config/                   # env, db connection, computed paths
│   │   ├── routes/                    # thin: validate, delegate, respond
│   │   │   ├── health.routes.ts, specs.routes.ts, runs.routes.ts, history.routes.ts
│   │   ├── services/                   # the actual logic
│   │   │   ├── testRunner.service.ts     # spawns Playwright, streams output, persists results
│   │   │   ├── specDiscovery.service.ts   # scans the target suite's tests/ dir
│   │   │   ├── failureClassifier.service.ts  # rules-based pass/fail-reason heuristic
│   │   │   ├── envHealth.service.ts        # pre-flight target-reachability probe
│   │   │   ├── reportArchive.service.ts     # archives Playwright's HTML report per run
│   │   │   └── runRepository.service.ts      # Mongoose CRUD + orphaned-run reconciliation
│   │   ├── lib/                       # pure, independently-tested helpers
│   │   │   ├── childEnv.ts, playwrightReport.ts, runId.ts
│   │   ├── models/Run.ts               # the one Mongoose schema this app has
│   │   └── test/                        # Vitest setup + a fixture e2e suite for CI
│   └── e2e-suite/                   # bundled snapshot of Provisio's e2e/ folder (see below)
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx, App.tsx          # provider nesting + routes
│   │   ├── context/                     # Theme, User, Socket, Toast
│   │   ├── hooks/useRunStream.ts          # the run-lifecycle Socket.io listener
│   │   ├── components/                     # layout/, dashboard/, history/, + shared
│   │   ├── pages/DashboardPage.tsx, HistoryPage.tsx
│   │   ├── api/                             # typed fetch wrappers per resource
│   │   └── lib/format.ts                     # duration/relative-time formatting
└── .github/workflows/ci.yml       # server + client test suites on push/PR
```

## The stack at a glance

| Layer | Technology | Role |
|---|---|---|
| Runtime | Node.js 24 | Server runtime |
| Language | TypeScript, `strict` | Both client and server |
| HTTP server | Express 5 | REST API |
| Real-time | Socket.io 4 | Streaming live run output |
| Process control | Node's built-in `child_process` | Spawning Playwright |
| Scheduling | node-cron + cron-parser | Firing scheduled runs; computing the next fire times shown in the UI |
| Email | Nodemailer (any SMTP provider) | Emailing scheduled-run reports — inert until SMTP settings exist |
| Database | MongoDB (Mongoose) | Run history — see [Persistence](#persistence-mongodb-not-flat-file) below |
| Dev loop (server) | `tsx watch` | TS execution with no separate build step |
| UI library | React 19 | Component model |
| Build tool | Vite | Dev server, HMR, production bundling |
| Routing | React Router | Client-side routing (`/`, `/history`, `/schedules`) |
| Styling | Tailwind CSS v4 | Utility-first, dark-mode-by-default |
| Icons | lucide-react | Icon set |
| Real-time client | socket.io-client | Receives run events |
| Testing | Vitest, Supertest, React Testing Library, mongodb-memory-server | See [Testing](#testing) |
| CI/CD | GitHub Actions, Render, Vercel | See [Deployment](#deployment) |

## Backend

**Bootstrap order matters** (`server.ts`): Socket.io's `attach()` snapshots whatever request listeners already exist on the `http.Server` and re-wraps them — so `io` is constructed *before* Express is attached, `createApp(io)` builds the Express app (routes that trigger runs need `io` to join sockets to rooms), then `io.attach(httpServer)` last. Getting this order wrong causes both Express and Socket.io to independently try to handle every request and crash with `ERR_HTTP_HEADERS_SENT` — a real bug hit and fixed during Phase 2, not a hypothetical.

**Layering**: routes validate input and delegate; services hold the actual logic and never import Express types; `runRepository.service.ts` is the only thing that touches the `Run` Mongoose model directly. `testRunner.service.ts` is the centerpiece — it generates a run id, joins the requesting socket to a room named `run:<id>`, spawns `npx playwright test <specs> --workers=1 --reporter=list,json,html`, streams stdout/stderr line-by-line to that room, and on exit parses the JSON reporter's output for accurate pass/fail counts (kept in its own file via `PLAYWRIGHT_JSON_OUTPUT_NAME` so it isn't mixed into the same stdout stream as the target suite's own console output).

## Frontend

Provider nesting in `main.tsx`: `ThemeProvider` → `UserProvider` → `SocketProvider` → `ToastProvider` → the router. `SocketContext` creates **one** Socket.io connection at module scope, shared by every consumer rather than opened per-component. `useRunStream` registers its event listeners once on mount — not when a run starts — so a `run:started` event that arrives in the gap between the POST response and attaching a listener can never be missed; a ref (not state) tracks which run id is "ours" so late-arriving events for a different run get filtered out rather than corrupting the current view.

Dark mode is the **default**, not system-preference-driven like Provisio — a deliberate difference, since this reads as a dev-tool-style app rather than a general product. The `FailureBadge` tooltip renders through a React portal into `document.body` rather than being positioned inline: the History table wraps rows in `overflow-x-auto` for horizontal scrolling, and (per the CSS spec) constraining one overflow axis constrains the other too — a naively-positioned tooltip got silently clipped for any row near the bottom of the table. Confirmed via `getBoundingClientRect()` before and after the fix.

## Persistence: MongoDB, not flat-file

The system this project is modeled on used flat JSON files with an atomic write-then-rename pattern and no database at all. This project uses MongoDB (Mongoose) instead — a deliberate choice made up front, not a missed detail: it reuses the MongoDB Atlas cluster already running for Provisio, and demonstrating real database integration is more useful for this portfolio's purpose than replicating a flat-file design that existed there mainly to avoid needing a database at all.

## The test-run pipeline, end to end

`POST /api/runs/start` → `testRunner.startRun()` joins the socket to `run:<id>`, persists a `running` record, emits `run:started`, kicks off a pre-flight health probe **concurrently** (not blocking the run itself) → spawns Playwright with a hard `--workers=1` → streams every output line to the room as it happens → on exit, parses the JSON report for real counts, runs the failure classifier if it failed, archives the HTML report to `server/reports/<runId>/html/`, persists the final result, and emits `run:completed`.

**Why `--workers=1` is forced**, regardless of what the target suite's own `playwright.config.ts` defaults to: free-tier Render gives this backend 512MB of RAM. Playwright's default worker count (4, when `CI` isn't set — which Render doesn't set) means multiple concurrent Chromium instances, which comfortably exceeds that and OOM-kills the whole Node process — not just the test run. That takes the in-memory active-run registry down with it, permanently orphaning that run's database record in `running` state forever, since nothing is left to ever call `completeRun` for it. This was found by triggering real runs against the deployed backend and watching them get stuck — not anticipated in advance.

**`reconcileOrphanedRuns()`** runs once at server startup as the other half of that fix: any run still marked `running` when the server boots was orphaned by whatever killed the previous process, and gets marked `failed` with an honest "the server restarted while this run was in progress" signal instead of staying stuck forever.

## Scheduling

Schedules live in MongoDB; the in-memory cron tasks are just the live wiring, rebuilt from the database at boot and re-registered whenever a schedule is created, edited, paused or deleted.

- **Cadence is stored as its parts** (type, hour, minute, day) rather than as cron text, so the UI can render it as controls and describe it in plain English. Cron is only how it reaches node-cron; "custom" is the one case where the author writes cron themselves, validated before it's accepted.
- **Each schedule carries an IANA time zone**, captured from the author's browser. node-cron fires on that zone and cron-parser computes the next occurrences in it, so a 09:00 schedule stays 9am locally across daylight-saving changes even though the server runs on UTC.
- **"All specs" stores no spec ids.** It's resolved at fire time, so specs added to Provisio later are included without editing the schedule.
- **One run at a time.** A schedule that fires while another run is in progress is skipped with a logged reason rather than queued: a free-tier container has room for one Playwright browser, and an hourly schedule overlapping itself would pile up.
- **A scheduled run has no socket to stream to** when it starts, so `socketId` is optional; the run still streams into its own room for anyone who opens the Dashboard mid-run, and always lands in Run History marked `trigger: "scheduled"` with the schedule's name.
- **Email is a courtesy, never a failure.** Sending happens after the run is recorded and can't throw; the outcome (sent, skipped, failed, with a reason) is stored on the schedule and shown on its row.

## The failure classifier

A conservative, explainable, **rules-based** system — no ML, and every contributing signal is shown verbatim in the UI's badge tooltip rather than hidden behind a score.

- A weighted table of regexes over the (ANSI-stripped) run output. Environment signals: `ECONNREFUSED`/`ECONNRESET`, `net::ERR_*`, TLS/certificate errors, navigation timeouts, 5xx responses, a webServer that never came up. UI-change signals: a locator resolving to zero elements, a strict-mode violation, a detached element, a failed visible-content assertion.
- **Blast radius**: every selected spec failing together weights toward "environment"; exactly one spec failing among passing siblings weights toward "UI change."
- A pre-flight **environment health probe**, run concurrently with the test itself — if the target was already unreachable before the run even started, that's a strong, independent environment signal.
- Ties, or zero signals at all, land on "unknown" rather than guessing — the whole point is to be honest about uncertainty, not confidently wrong.

This isn't hypothetical: a real Render free-tier cold start on Provisio's side (21 seconds just to respond) was caught live by the pre-flight probe during deployment verification and correctly classified as an environment issue, at 50% confidence, with both contributing signals shown in the tooltip.

## The bundled e2e suite

This backend needs an actual copy of Provisio's `e2e/` folder to spawn Playwright against. Locally, `PROVISIO_E2E_PATH` just points at the sibling Provisio checkout. In production there's no sibling checkout — Render's container only has this repo — so `server/e2e-suite/` is a **committed snapshot** of Provisio's `e2e/` directory (specs, helpers, `playwright.config.ts`, `global-setup.ts`), not a live link or a git submodule. That was a deliberate choice over cloning Provisio's repo at build time: simpler, no network dependency added to every deploy, at the cost of needing a manual re-copy if Provisio's suite changes in a way this app should pick up.

Two things had to change in Provisio's own suite to make this work standalone:
- A `TARGET_ENV=live` switch (in Provisio's own `playwright.config.ts`/`constants.ts`) that points the suite at the real deployed Vercel/Render URLs and skips the local-dev `webServer` entries entirely, since there's nothing local to spin up from inside claritas-e2e's container.
- Provisio's `global-setup.ts` used to *unconditionally* seed an admin user into a local MongoDB before every run. That has no meaning against `live` (no local Mongo, no local server checkout) and would fail every run before a single test executed — fixed to skip that step when `TARGET_ENV=live`. One known, accepted gap results: `admin-override.spec.ts` can't pass against live, since there's no admin account on the real Atlas database with credentials this suite knows. Every other spec registers its own test users via the API and isn't affected.

## Configuration & environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_ORIGIN` | Frontend origin — drives CORS for both REST and the Socket.io handshake |
| `PROVISIO_E2E_PATH` | Absolute path to the target suite (sibling checkout locally, `server/e2e-suite` in production) |
| `PROVISIO_LOCAL_HEALTH_URL` / `PROVISIO_LIVE_HEALTH_URL` | Pre-flight health-check targets per environment. Blank means "skip this check" (`ok: null`), not a failure — there's nothing meaningful to check for "Local" in production, since no local Provisio instance is reachable from that container |
| `HEALTH_TIMEOUT_MS` | Health-probe timeout |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Mail transport for scheduled-run reports. All optional: with any of them missing, schedules still run and each report is recorded as `skipped` with the reason, which the UI shows |
| `MAIL_FROM` | "From" address on report emails; falls back to `SMTP_USER` |
| `PUBLIC_URL` | This API's own public URL, used to build the report link inside emails |
| `PLAYWRIGHT_BROWSERS_PATH=0` | Forces the browser install into `node_modules` instead of the default `~/.cache` — see [Known quirks](#known-quirks--gotchas) |

## Running locally

```bash
docker compose up -d                 # local MongoDB

cd server && cp .env.example .env && npm install && npm run dev   # http://localhost:4001
cd client && cp .env.example .env && npm install && npm run dev   # http://localhost:5174
```

`PROVISIO_E2E_PATH` in `server/.env` needs to point at a real Provisio `e2e/` checkout on your machine (defaults to a sibling directory).

## Testing

- **Backend** (Vitest + Supertest + `mongodb-memory-server`) — 57 tests. The genuinely interesting part: `testRunner.service.ts` was mostly untestable orchestration (spawning processes, streaming output), so its pure logic — env-var stripping, Playwright JSON report parsing, run-id generation — was extracted into standalone `lib/` modules specifically so it could be unit tested without touching `child_process` at all. `envHealth` spins up a real local HTTP server rather than mocking `fetch`; route tests point at a small fixture suite instead of a real Provisio checkout, since CI has no such checkout to depend on.
- **Frontend** (Vitest + React Testing Library) — 43 tests, including a hand-rolled fake Socket.io object (`on`/`off`/`trigger`) so `useRunStream`'s event-filtering logic can be tested deterministically without a real network connection, and a regression test asserting `FailureBadge`'s tooltip specifically renders through a portal into `document.body` — guarding against the exact clipping bug described above ever coming back.
- **CI** — both suites run on every push/PR via GitHub Actions. No end-to-end job: this repo has no Playwright suite of its own to run in that sense — it's the thing that runs *other* projects' suites.

## Deployment

**Backend — Render.** `render.yaml` is a Blueprint: `npm ci --include=dev && npm run build`, then a second install and a real Chromium download for the bundled e2e suite. Getting this right took several real, sequential fixes, each found from an actual failed deploy log, not anticipated:

- `npm ci` for the bundled suite needed `--include=dev` too — under `NODE_ENV=production`, and with that suite's dependencies being *entirely* dev-only (`@playwright/test`, `typescript`, `@types/node`), a plain `npm ci` silently installed nothing at all.
- `--with-deps` on the Playwright browser install tries to install OS packages via `sudo`, which Render's build sandbox doesn't permit — dropped it; the base image already had what Chromium needed.
- Render's build and runtime run in **separate containers** — only the project's own directory tree survives the handoff between them. Playwright's default browser cache (`~/.cache/ms-playwright`) lives outside that tree, so the browser downloaded fine during build and was simply gone by the time the server tried to launch it. `PLAYWRIGHT_BROWSERS_PATH=0` installs into `node_modules` instead, which does survive.
- Changing render.yaml's `buildCommand` did **not** automatically apply to the existing service on the next deploy — Render locks that setting in at service-creation time; it needed a manual update in the dashboard to actually take effect.

**Frontend — Vercel.** Static Vite build with an SPA rewrite (`/(.*) → /index.html`) so a direct load of `/history` doesn't 404. `VITE_API_URL`/`VITE_SOCKET_URL` point at the Render backend's real URL.

## Known quirks & gotchas

- **Render build vs. runtime are different containers.** Anything installed outside the project's own directory tree during build (browser binaries, anything written to a home-directory cache) does not exist at runtime.
- **Render Blueprint config changes don't auto-sync to an existing service.** `render.yaml` is only fully read at first creation; a later edit to `buildCommand` needs a manual dashboard update to actually apply, even though environment variable changes do seem to trigger a redeploy.
- **Free-tier resource limits are real, not theoretical.** 512MB RAM is enough for one Playwright worker, not several concurrent ones — see `--workers=1` above. This also means cold starts (a service that's been idle) can take 15–20+ seconds to respond, which is exactly the scenario the pre-flight health probe exists to catch honestly rather than let surface as a confusing false "UI change."
- **MongoDB Atlas connection strings need the database name in the path, not just query params**, and any special character in the password (`@` especially — it's the credentials/host delimiter) must be percent-encoded or it breaks parsing entirely.
- **A shared Atlas database user affects every service using it.** Rotating a password for one deployment's sake immediately breaks every other service still configured with the old one — worth remembering before touching credentials shared across projects.
