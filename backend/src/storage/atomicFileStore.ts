import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export class AtomicFileStore {
  private static readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
    const key = path.resolve(filePath);
    const previous = AtomicFileStore.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => current);
    AtomicFileStore.tails.set(key, tail);
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (AtomicFileStore.tails.get(key) === tail) AtomicFileStore.tails.delete(key);
    }
  }

  async write(filePath: string, content: string) {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async backupAndWrite(filePath: string, content: string, trashDir: string, backupName = path.basename(filePath)) {
    await mkdir(trashDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(filePath, path.join(trashDir, `${timestamp}-${randomUUID()}-${backupName}`));
    await this.write(filePath, content);
  }
}
