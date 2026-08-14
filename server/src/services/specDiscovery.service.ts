import { readdir, readFile } from "fs/promises";
import path from "path";
import { env } from "../config/env";
import type { Spec } from "../types";

const DESCRIBE_PATTERN = /test\.describe\(\s*["'`]([^"'`]+)["'`]/;

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.spec\.ts$/, "");
  return base
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function titleForSpec(filePath: string, fileName: string): Promise<string> {
  const content = await readFile(filePath, "utf-8");
  const match = content.match(DESCRIBE_PATTERN);
  return match ? match[1] : titleFromFileName(fileName);
}

/** Scans the target e2e suite's tests directory and returns one entry per spec file. */
export async function discoverSpecs(): Promise<Spec[]> {
  const testsDir = path.join(env.provisioE2ePath, "tests");
  const entries = await readdir(testsDir);
  const specFiles = entries.filter((name) => name.endsWith(".spec.ts")).sort();

  const specs = await Promise.all(
    specFiles.map(async (fileName) => ({
      id: fileName.replace(/\.spec\.ts$/, ""),
      fileName,
      title: await titleForSpec(path.join(testsDir, fileName), fileName),
    })),
  );

  return specs;
}
