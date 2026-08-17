import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  BackupService,
  createPgDumpArguments,
} from "./BackupService.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => (
    rm(directory, { recursive: true, force: true })
  )));
});

describe("BackupService", () => {
  it("passes a connection URI explicitly instead of treating it as a database name", () => {
    expect(createPgDumpArguments(
      "postgresql://flydon@%2Fvar%2Frun%2Fpostgresql/flydeck",
      "/tmp/flydeck.dump",
    )).toEqual([
      "--dbname",
      "postgresql://flydon@%2Fvar%2Frun%2Fpostgresql/flydeck",
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      "/tmp/flydeck.dump",
    ]);
  });

  it("publishes progress and atomically saves a completed dump", async () => {
    const directory = await temporaryDirectory();
    const service = new BackupService({
      backupDirectory: directory,
      backupRetention: 7,
      databaseUrl: "postgresql://example/flydeck",
    }, async (databaseUrl, targetPath) => {
      expect(databaseUrl).toBe("postgresql://example/flydeck");
      expect(targetPath).toMatch(/\.dump\.partial$/);
      await writeFile(targetPath, "backup-content");
    }, () => new Date("2026-08-15T10:00:00.123Z"));

    expect(service.start()).toMatchObject({ state: "running" });
    const completed = await waitForCompletion(service);

    expect(completed).toMatchObject({
      state: "succeeded",
      fileName: "flydeck-20260815T100000123Z.dump",
      sizeBytes: 14,
      sha256: "a92e0ec81286ff0f9ccf5982a22a83a0b70082446d5fd7af0eb9a3ceacd16c86",
    });
    expect(await readdir(directory)).toEqual([completed.fileName]);
    expect(await readFile(path.join(directory, completed.fileName!), "utf8"))
      .toBe("backup-content");
  });

  it("removes a partial file and reports a failed dump", async () => {
    const directory = await temporaryDirectory();
    const service = new BackupService({
      backupDirectory: directory,
      backupRetention: 7,
      databaseUrl: "postgresql://example/flydeck",
    }, async (_databaseUrl, targetPath) => {
      await writeFile(targetPath, "partial");
      throw new Error("pg_dump failed");
    });

    service.start();
    const completed = await waitForCompletion(service);

    expect(completed).toMatchObject({
      state: "failed",
      message: "pg_dump failed",
    });
    expect(await readdir(directory)).toEqual([]);
  });
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "flydeck-backup-test-"));
  directories.push(directory);
  return directory;
}

async function waitForCompletion(service: BackupService) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const status = await service.status();
    if (status.state !== "running") return status;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Backup did not complete");
}
