import { describe, it, expect } from "vitest";
import request from "supertest";
import { Server } from "socket.io";
import { createApp } from "../../app";

const app = createApp(new Server());

describe("GET /api/specs", () => {
  it("returns every spec found in the target suite (the fixture suite in tests)", async () => {
    const res = await request(app).get("/api/specs");

    expect(res.status).toBe(200);
    expect(res.body.specs).toHaveLength(2);
    expect(res.body.specs.map((s: { fileName: string }) => s.fileName).sort()).toEqual([
      "sample-a.spec.ts",
      "sample-b.spec.ts",
    ]);
  });
});
