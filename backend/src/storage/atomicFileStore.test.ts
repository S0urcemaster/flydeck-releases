import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AtomicFileStore } from "./atomicFileStore.js";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("AtomicFileStore", () => {
  it("serializes operations targeting the same file", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "flydeck-atomic-"));
    const filePath = path.join(root, "data.md");
    const files = new AtomicFileStore();
    await files.write(filePath, "start");
    const order: string[] = [];

    const first = files.runExclusive(filePath, async () => {
      order.push("first-start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await files.write(filePath, "first");
      order.push("first-end");
    });
    const second = files.runExclusive(filePath, async () => {
      order.push("second-start");
      await files.write(filePath, `${await readFile(filePath, "utf8")}+second`);
      order.push("second-end");
    });

    await Promise.all([first, second]);
    expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
    await expect(readFile(filePath, "utf8")).resolves.toBe("first+second");
  });
});
