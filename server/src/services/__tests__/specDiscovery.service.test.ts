import { describe, it, expect } from "vitest";
import { discoverSpecs } from "../specDiscovery.service";

describe("discoverSpecs", () => {
  it("finds every .spec.ts file in the target suite's tests directory", async () => {
    const specs = await discoverSpecs();
    expect(specs.map((s) => s.fileName).sort()).toEqual(["sample-a.spec.ts", "sample-b.spec.ts"]);
  });

  it("uses the spec's describe() title when it has one", async () => {
    const specs = await discoverSpecs();
    const specA = specs.find((s) => s.id === "sample-a");
    expect(specA?.title).toBe("sample group A");
  });

  it("falls back to a title-cased filename when there's no describe() block", async () => {
    const specs = await discoverSpecs();
    const specB = specs.find((s) => s.id === "sample-b");
    expect(specB?.title).toBe("Sample B");
  });

  it("derives id as the filename without the .spec.ts extension", async () => {
    const specs = await discoverSpecs();
    for (const spec of specs) {
      expect(spec.fileName).toBe(`${spec.id}.spec.ts`);
    }
  });
});
