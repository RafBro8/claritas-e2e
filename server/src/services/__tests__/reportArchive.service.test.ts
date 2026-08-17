import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { archiveReport } from "../reportArchive.service";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("archiveReport", () => {
  it("copies the source report directory into reportsDir/<runId>/html", async () => {
    const sourceDir = await mkdtemp(path.join(tmpdir(), "claritas-source-"));
    const reportsDir = await mkdtemp(path.join(tmpdir(), "claritas-reports-"));
    tempDirs.push(sourceDir, reportsDir);

    await writeFile(path.join(sourceDir, "index.html"), "<html>fixture report</html>");
    await mkdir(path.join(sourceDir, "data"));
    await writeFile(path.join(sourceDir, "data", "results.json"), "{}");

    const hasReport = await archiveReport("run_test_1234", sourceDir, reportsDir);

    expect(hasReport).toBe(true);
    const copied = await readFile(path.join(reportsDir, "run_test_1234", "html", "index.html"), "utf-8");
    expect(copied).toBe("<html>fixture report</html>");
    const copiedNested = await readFile(
      path.join(reportsDir, "run_test_1234", "html", "data", "results.json"),
      "utf-8",
    );
    expect(copiedNested).toBe("{}");
  });

  it("returns false without throwing when the source directory doesn't exist", async () => {
    const reportsDir = await mkdtemp(path.join(tmpdir(), "claritas-reports-"));
    tempDirs.push(reportsDir);

    const hasReport = await archiveReport(
      "run_test_5678",
      path.join(tmpdir(), "claritas-source-does-not-exist-12345"),
      reportsDir,
    );

    expect(hasReport).toBe(false);
  });
});
