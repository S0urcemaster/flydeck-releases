import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("configuration", () => {
  it("uses ~/flydesk-data as the default DATA home", () => {
    expect(loadConfig({}).dataHome).toBe(path.join(os.homedir(), "flydesk-data"));
  });

  it("accepts a custom DATA_HOME", () => {
    expect(loadConfig({ DATA_HOME: "/srv/flydesk-data" }).dataHome).toBe("/srv/flydesk-data");
  });

  it("keeps authentication disabled by default", () => {
    expect(loadConfig({}).auth).toEqual({ mode: "off", token: undefined, secureCookie: true });
  });

  it("requires a sufficiently long token when authentication is enabled", () => {
    expect(() => loadConfig({ AUTH_MODE: "token", AUTH_TOKEN: "short" })).toThrow(/at least 16/);
    expect(loadConfig({ AUTH_MODE: "token", AUTH_TOKEN: "a-secure-token-123" }).auth.mode).toBe("token");
  });
});
