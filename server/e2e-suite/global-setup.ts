import { execSync } from "node:child_process";
import path from "node:path";
import {
  BACKEND_URL,
  E2E_MONGODB_URI,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_ADMIN_NAME,
} from "./tests/helpers/constants";

const SERVER_DIR = path.resolve(__dirname, "../server");
const E2E_DATABASE = new URL(E2E_MONGODB_URI).pathname.slice(1);

// Locally, playwright.config.ts reuses any server already listening on :4000
// rather than starting its own — and a leftover one from another session may
// be pointed at the everyday dev database instead. That once made the
// double-booking spec fail against a stale backend whose database had lost
// its unique index, which looked exactly like a real regression. So before
// anything runs, ask the backend which database it's on and stop if it's
// the wrong one.
async function assertBackendUsesE2EDatabase(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/health`);
  const health = (await res.json()) as { database?: string };

  if (health.database !== E2E_DATABASE) {
    throw new Error(
      `The backend on ${BACKEND_URL} is using the "${health.database ?? "unknown"}" database, ` +
        `not "${E2E_DATABASE}". It's probably a leftover server from another session that ` +
        `Playwright reused. Stop whatever is listening on that port and run the suite again.`,
    );
  }
}

// Admin accounts can't be created through the public API by design (see
// server/src/controllers/auth.controller.ts), so the e2e admin-override spec
// needs one seeded some other way. Rather than reimplementing the
// bcrypt-hashing logic here, this just runs the actual script the project
// ships for provisioning admins (server/scripts/seed-admin.ts) against the
// e2e database, pointed at throwaway test credentials.
//
// Only runs for the local target. Live mode has no local server/ checkout to
// run this script from and no local MongoDB to seed into — this suite is
// typically bundled standalone (just the e2e/ folder, no server/) wherever
// it drives the live deployment from, e.g. claritas-e2e's Render backend.
// admin-override.spec.ts is a known gap against live as a result: there's no
// admin account on the real Atlas database with credentials this suite
// knows, so that one spec is expected to fail there — every other spec
// registers its own test users via the API and doesn't need this step.
export default async function globalSetup(): Promise<void> {
  if (process.env.TARGET_ENV === "live") return;

  await assertBackendUsesE2EDatabase();

  execSync("npm run seed:admin", {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      MONGODB_URI: E2E_MONGODB_URI,
      SEED_ADMIN_EMAIL: E2E_ADMIN_EMAIL,
      SEED_ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      SEED_ADMIN_NAME: E2E_ADMIN_NAME,
    },
    stdio: "inherit",
  });
}
