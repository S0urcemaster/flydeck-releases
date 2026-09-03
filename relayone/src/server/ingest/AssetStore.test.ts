import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { AssetDigestMismatchError, AssetStore } from "./AssetStore.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("AssetStore", () => {
  it("stores verified content below its digest", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "relay-assets-"));
    directories.push(directory);
    const content = Buffer.from("image payload");
    const hash = createHash("sha256").update(content).digest("hex");
    const store = new AssetStore(directory);

    const storedPath = await store.put(hash, content);

    expect(await readFile(storedPath)).toEqual(content);
    expect(storedPath).toContain(path.join(hash.slice(0, 2), hash.slice(2, 4), hash));
    expect(await store.has(hash, content.length)).toBe(true);
  });

  it("rejects content that does not match the requested digest", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "relay-assets-"));
    directories.push(directory);
    const store = new AssetStore(directory);

    await expect(store.put("0".repeat(64), Buffer.from("wrong")))
      .rejects.toBeInstanceOf(AssetDigestMismatchError);
  });
});
