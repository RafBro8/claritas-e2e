import { test } from "@playwright/test";

test.describe("sample group A", () => {
  test("does a thing", async () => {
    // Fixture only — never actually run by Playwright. discoverSpecs just
    // reads this file's text to find the describe() title.
  });
});
