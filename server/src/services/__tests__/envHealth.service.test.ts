import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { checkEnvironmentHealth } from "../envHealth.service";

describe("checkEnvironmentHealth", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200).end("ok");
      } else if (req.url === "/broken") {
        res.writeHead(500).end("broken");
      } else {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("returns ok: null and skips the check entirely when the URL is blank", async () => {
    const result = await checkEnvironmentHealth("");
    expect(result.ok).toBeNull();
    expect(result.checkedAt).toBeTruthy();
  });

  it("returns ok: true with the status code for a healthy endpoint", async () => {
    const result = await checkEnvironmentHealth(`${baseUrl}/ok`);
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it("returns ok: false with the status code for a 5xx response", async () => {
    const result = await checkEnvironmentHealth(`${baseUrl}/broken`);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(500);
  });

  it("returns ok: false with an error message when the target is unreachable", async () => {
    // Nothing listens on this port — a real connection failure, not a mock.
    const result = await checkEnvironmentHealth("http://127.0.0.1:1");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.statusCode).toBeUndefined();
  });
});
