import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { parseJsonReport } from "../playwrightReport";

async function writeFixture(content: unknown): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "claritas-report-"));
  const filePath = path.join(dir, "results.json");
  await writeFile(filePath, JSON.stringify(content));
  return filePath;
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("parseJsonReport", () => {
  it("extracts counts from an all-passing report", async () => {
    const filePath = await writeFixture({
      stats: { expected: 3, unexpected: 0, skipped: 0, flaky: 0 },
      suites: [
        {
          file: "auth.spec.ts",
          suites: [
            {
              specs: [
                { file: "auth.spec.ts", ok: true },
                { file: "auth.spec.ts", ok: true },
                { file: "auth.spec.ts", ok: true },
              ],
            },
          ],
        },
      ],
    });
    tempDirs.push(path.dirname(filePath));

    const result = await parseJsonReport(filePath);

    expect(result).toEqual({
      counts: { passed: 3, failed: 0, skipped: 0, flaky: 0 },
      failedFiles: [],
    });
  });

  it("finds every failed spec's file across nested suites, deduplicated", async () => {
    const filePath = await writeFixture({
      stats: { expected: 4, unexpected: 2, skipped: 0, flaky: 0 },
      suites: [
        {
          file: "booking-flow.spec.ts",
          specs: [{ file: "booking-flow.spec.ts", ok: false }],
          suites: [
            {
              specs: [
                { file: "booking-flow.spec.ts", ok: false }, // same file, second failing spec
                { file: "booking-flow.spec.ts", ok: true },
              ],
            },
          ],
        },
        {
          file: "auth.spec.ts",
          specs: [{ file: "auth.spec.ts", ok: true }],
        },
      ],
    });
    tempDirs.push(path.dirname(filePath));

    const result = await parseJsonReport(filePath);

    expect(result?.counts).toEqual({ passed: 4, failed: 2, skipped: 0, flaky: 0 });
    expect(result?.failedFiles).toEqual(["booking-flow.spec.ts"]);
  });

  it("carries skipped and flaky counts through", async () => {
    const filePath = await writeFixture({
      stats: { expected: 2, unexpected: 0, skipped: 1, flaky: 1 },
      suites: [],
    });
    tempDirs.push(path.dirname(filePath));

    const result = await parseJsonReport(filePath);

    expect(result?.counts).toEqual({ passed: 2, failed: 0, skipped: 1, flaky: 1 });
  });

  it("returns null for a file that doesn't exist", async () => {
    const result = await parseJsonReport(path.join(tmpdir(), "does-not-exist-12345", "results.json"));
    expect(result).toBeNull();
  });

  it("returns null for unparseable JSON", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "claritas-report-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "results.json");
    await writeFile(filePath, "{ not valid json");

    const result = await parseJsonReport(filePath);
    expect(result).toBeNull();
  });
});
