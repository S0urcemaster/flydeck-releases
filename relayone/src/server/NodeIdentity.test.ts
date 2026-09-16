import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadOrCreateNodeIdentity } from "./NodeIdentity.js";

describe("node identity", () => {
  it("persists one stable Ed25519 identity for a configured node", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "relay-identity-"));
    try {
      const first = await loadOrCreateNodeIdentity(directory, "relay-two");
      const second = await loadOrCreateNodeIdentity(directory, "relay-two");
      expect(second).toMatchObject({
        algorithm: first.algorithm,
        publicKey: first.publicKey,
        fingerprint: first.fingerprint,
      });
      expect(first.algorithm).toBe("Ed25519");
      expect(first.fingerprint).toHaveLength(43);
      const stored = JSON.parse(await readFile(path.join(directory, "identity.json"), "utf8"));
      expect(stored.nodeId).toBe("relay-two");
      expect(stored.privateKeyPem).toContain("PRIVATE KEY");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses to reuse another node's private identity", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "relay-identity-"));
    try {
      await loadOrCreateNodeIdentity(directory, "relay-one");
      await expect(loadOrCreateNodeIdentity(directory, "relay-two"))
        .rejects.toThrow("belongs to relay-one");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
