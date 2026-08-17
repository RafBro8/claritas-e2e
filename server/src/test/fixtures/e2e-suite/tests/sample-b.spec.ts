import { test } from "@playwright/test";

// Deliberately no describe() block, so discoverSpecs falls back to a
// title-cased version of the filename ("Sample B").
test("does another thing", async () => {
  // Fixture only — never actually run.
});
