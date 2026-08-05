import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseLegacyDataTitle,
  readLegacyCronFile,
  readLegacyDataDirectory,
} from "./v1Import.js";

describe("V1 import sources", () => {
  it("turns each regular DATA Markdown file into one import document", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "flydeck-v1-data-"));
    await writeFile(
      path.join(directory, "Ideen.md"),
      "# Ideen\n\ncreated: 2026-01-01T00:00:00.000Z\n\n--data--\nEins\nZwei\n",
    );
    await mkdir(path.join(directory, "trash"));
    await writeFile(path.join(directory, "ignore.txt"), "not DATA");
    await symlink(path.join(directory, "Ideen.md"), path.join(directory, "Link.md"));

    const files = await readLegacyDataDirectory(directory);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ sourceKey: "Ideen.md", title: "Ideen" });
    expect(files[0].entries).toEqual(["Eins", "Zwei"]);
    expect(files[0]).not.toHaveProperty("content");
    expect(files[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validates the V1 DATA marker and title", () => {
    expect(parseLegacyDataTitle("# Liste\n\n--data--\nEintrag\n")).toBe("Liste");
    expect(() => parseLegacyDataTitle("# Liste\n")).toThrow("Marker");
    expect(() => parseLegacyDataTitle("--data--\nEintrag\n")).toThrow("title");
  });

  it("reads the V1 CRON JSON-lines format", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "flydeck-v1-cron-"));
    const filePath = path.join(directory, "cron.md");
    await writeFile(filePath, [
      "# Cron Timer",
      "",
      "format: json-lines",
      "",
      "--data--",
      JSON.stringify({
        id: "00000000-0000-4000-8000-000000000001",
        title: "Bericht",
        dueAt: "2026-08-06T08:00:00.000Z",
        createdAt: "2026-08-05T08:00:00.000Z",
        status: "active",
      }),
      "",
    ].join("\n"));

    const timers = await readLegacyCronFile(filePath);

    expect(timers).toHaveLength(1);
    expect(timers[0]).toMatchObject({
      sourceKey: "00000000-0000-4000-8000-000000000001",
      timer: { title: "Bericht", status: "active" },
    });
  });
});
