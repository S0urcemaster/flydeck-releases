import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  mkdir,
  readdir,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import {
  backupStatusDtoSchema,
  type BackupStatusDto,
} from "@flydeck/shared/v2";

export type BackupDumpRunner = (
  databaseUrl: string,
  targetPath: string,
) => Promise<void>;

export class BackupService {
  private current: BackupStatusDto = emptyStatus();

  constructor(
    private readonly config: {
      backupDirectory: string;
      backupRetention: number;
      databaseUrl: string;
    },
    private readonly dump: BackupDumpRunner = runPgDump,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async status() {
    if (this.current.state !== "idle") return this.current;
    const latest = await this.latestBackup();
    if (latest) this.current = latest;
    return this.current;
  }

  start() {
    if (this.current.state === "running") return this.current;
    const startedAt = this.now();
    const fileName = `flydeck-${backupTimestamp(startedAt)}.dump`;
    this.current = backupStatusDtoSchema.parse({
      state: "running",
      startedAt: startedAt.toISOString(),
      completedAt: null,
      fileName,
      sizeBytes: null,
      sha256: null,
      message: "Backup is running",
    });
    void this.createBackup(startedAt, fileName);
    return this.current;
  }

  private async createBackup(startedAt: Date, fileName: string) {
    const finalPath = path.join(this.config.backupDirectory, fileName);
    const partialPath = `${finalPath}.partial`;
    try {
      await mkdir(this.config.backupDirectory, { recursive: true, mode: 0o700 });
      await unlink(partialPath).catch(() => undefined);
      await this.dump(this.config.databaseUrl, partialPath);
      await chmod(partialPath, 0o600);
      await rename(partialPath, finalPath);
      const [file, sha256] = await Promise.all([
        stat(finalPath),
        hashFile(finalPath),
      ]);
      const completedAt = this.now();
      this.current = backupStatusDtoSchema.parse({
        state: "succeeded",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        fileName,
        sizeBytes: file.size,
        sha256,
        message: "Backup saved",
      });
      await this.applyRetention().catch(() => undefined);
    } catch (error) {
      await unlink(partialPath).catch(() => undefined);
      this.current = backupStatusDtoSchema.parse({
        state: "failed",
        startedAt: startedAt.toISOString(),
        completedAt: this.now().toISOString(),
        fileName: null,
        sizeBytes: null,
        sha256: null,
        message: backupErrorMessage(error),
      });
    }
  }

  private async latestBackup(): Promise<BackupStatusDto | null> {
    let names: string[];
    try {
      names = (await readdir(this.config.backupDirectory))
        .filter((name) => /^flydeck-\d{8}T\d{9}Z\.dump$/.test(name))
        .sort()
        .reverse();
    } catch {
      return null;
    }
    const fileName = names[0];
    if (!fileName) return null;
    const file = await stat(path.join(this.config.backupDirectory, fileName));
    return backupStatusDtoSchema.parse({
      state: "succeeded",
      startedAt: null,
      completedAt: file.mtime.toISOString(),
      fileName,
      sizeBytes: file.size,
      sha256: null,
      message: "Last backup",
    });
  }

  private async applyRetention() {
    const names = (await readdir(this.config.backupDirectory))
      .filter((name) => /^flydeck-\d{8}T\d{9}Z\.dump$/.test(name))
      .sort()
      .reverse();
    await Promise.all(names.slice(this.config.backupRetention).map((name) => (
      unlink(path.join(this.config.backupDirectory, name))
    )));
  }
}

function emptyStatus(): BackupStatusDto {
  return {
    state: "idle",
    startedAt: null,
    completedAt: null,
    fileName: null,
    sizeBytes: null,
    sha256: null,
    message: "No backup yet",
  };
}

function backupTimestamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, "");
}

function backupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Backup failed";
  return message.trim().slice(0, 300) || "Backup failed";
}

async function hashFile(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function runPgDump(databaseUrl: string, targetPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("pg_dump", createPgDumpArguments(databaseUrl, targetPath), {
      env: process.env,
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-8_192);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `pg_dump exited with code ${code}`));
    });
  });
}

export function createPgDumpArguments(databaseUrl: string, targetPath: string) {
  return [
      "--dbname",
      databaseUrl,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      targetPath,
    ];
}
