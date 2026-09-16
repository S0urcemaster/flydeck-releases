import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

const requiredEnvironment = {
  DATABASE_URL: "postgresql://relay:secret@database:5432/relay",
};

describe("relay node configuration", () => {
  it("keeps the existing Relay One configuration compatible", () => {
    const config = loadConfig({
      ...requiredEnvironment,
      RELAYONE_TITLE: "Existing Relay One",
      RELAYONE_INFO: "Existing information",
    });

    expect(config.nodeId).toBe("relay-one");
    expect(config.title).toBe("Existing Relay One");
    expect(config.info).toBe("Existing information");
  });

  it("configures an equal relay node without a special build", () => {
    const config = loadConfig({
      ...requiredEnvironment,
      HOST: "0.0.0.0",
      RELAY_NODE_ID: "relay-two",
      RELAY_PUBLIC_ORIGIN: "https://relay-two.relay-one.de/",
      RELAY_TITLE: "Relay Two",
      RELAY_INFO: "Independent reference node",
      RELAY_ACCOUNTS_ENABLED: "true",
      RELAY_DIAGNOSTICS_ENABLED: "true",
    });

    expect(config).toMatchObject({
      host: "0.0.0.0",
      nodeId: "relay-two",
      publicOrigin: "https://relay-two.relay-one.de",
      title: "Relay Two",
      info: "Independent reference node",
      capabilities: {
        homeIngress: true,
        federation: false,
        accounts: true,
        diagnostics: true,
      },
    });
  });
});
