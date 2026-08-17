import path from "path";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      // MONGODB_URI's value here is never actually connected to — the
      // in-memory server in setup.ts is what tests really talk to — but
      // config/env.ts requires the var to be present at all. Same for
      // CLIENT_ORIGIN: only satisfies the required() check, no route test
      // depends on its actual value. Set directly here (rather than relying
      // on a local, gitignored .env existing) so the suite is self-contained
      // and runs the same locally and in CI.
      MONGODB_URI: "mongodb://localhost:27017/unused-in-tests",
      CLIENT_ORIGIN: "http://localhost:5174",
      // Points every test at a small fixture suite instead of a real
      // Provisio checkout, which won't exist in CI — specDiscovery and
      // reportArchive read straight from this path.
      PROVISIO_E2E_PATH: path.resolve(__dirname, "src/test/fixtures/e2e-suite"),
    },
    setupFiles: ["./src/test/setup.ts"],
    // Fixture spec files under test/fixtures end in .spec.ts (so
    // specDiscovery's real filter logic picks them up) — which also matches
    // Vitest's own default test-file pattern. Excluded explicitly so Vitest
    // doesn't try to collect and run them as if they were real test files
    // (they use Playwright's test() API, not Vitest's, and aren't meant to
    // ever execute).
    exclude: [...configDefaults.exclude, "src/test/fixtures/**"],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
