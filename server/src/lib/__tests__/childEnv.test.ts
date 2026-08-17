import { describe, it, expect } from "vitest";
import { buildChildEnv } from "../childEnv";

describe("buildChildEnv", () => {
  const sourceEnv = {
    PORT: "4001",
    MONGODB_URI: "mongodb://localhost:27018/claritas",
    CLIENT_ORIGIN: "http://localhost:5174",
    PROVISIO_E2E_PATH: "C:\\workspace\\provisio\\e2e",
    PROVISIO_LOCAL_HEALTH_URL: "http://localhost:4000/api/health",
    PROVISIO_LIVE_HEALTH_URL: "https://provisio-api.onrender.com/api/health",
    HEALTH_TIMEOUT_MS: "8000",
    PATH: "/usr/bin",
    SOME_OTHER_VAR: "keep-me",
  };

  it("strips this server's own operational env vars", () => {
    const result = buildChildEnv({}, sourceEnv);

    expect(result.PORT).toBeUndefined();
    expect(result.MONGODB_URI).toBeUndefined();
    expect(result.CLIENT_ORIGIN).toBeUndefined();
    expect(result.PROVISIO_E2E_PATH).toBeUndefined();
    expect(result.PROVISIO_LOCAL_HEALTH_URL).toBeUndefined();
    expect(result.PROVISIO_LIVE_HEALTH_URL).toBeUndefined();
    expect(result.HEALTH_TIMEOUT_MS).toBeUndefined();
  });

  it("keeps unrelated env vars untouched", () => {
    const result = buildChildEnv({}, sourceEnv);

    expect(result.PATH).toBe("/usr/bin");
    expect(result.SOME_OTHER_VAR).toBe("keep-me");
  });

  it("applies overrides on top of the stripped base", () => {
    const result = buildChildEnv({ TARGET_ENV: "live", FORCE_COLOR: "1" }, sourceEnv);

    expect(result.TARGET_ENV).toBe("live");
    expect(result.FORCE_COLOR).toBe("1");
  });

  it("lets an override reintroduce a normally-stripped key", () => {
    // Not exercised by testRunner today, but confirms overrides are applied
    // after stripping, not before — so a deliberate override always wins.
    const result = buildChildEnv({ PORT: "9999" }, sourceEnv);
    expect(result.PORT).toBe("9999");
  });

  it("does not mutate the source env object", () => {
    const original = { ...sourceEnv };
    buildChildEnv({ TARGET_ENV: "local" }, sourceEnv);
    expect(sourceEnv).toEqual(original);
  });
});
