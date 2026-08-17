import { describe, it, expect } from "vitest";
import request from "supertest";
import { Server } from "socket.io";
import { createApp } from "../../app";

const app = createApp(new Server());

describe("GET /api/health", () => {
  it("reports ok status and a connected database", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "connected" });
    expect(res.body.timestamp).toBeTruthy();
  });
});
