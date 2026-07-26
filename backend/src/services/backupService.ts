import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import type { ChatStore } from "../storage/chatStore.js";

type BackupOptions = {
  backupDir: string;
  dataHome: string;
  flydonDir: string;
  store: ChatStore;
};

export function createFlydonBackup({ backupDir, dataHome, flydonDir, store }: BackupOptions) {
  const parentDir = path.dirname(backupDir);
  const backupName = path.basename(backupDir);
  mkdirSync(parentDir, { recursive: true });
  const temporaryDir = mkdtempSync(path.join(parentDir, `.${backupName}.tmp-`));
  const previousDir = path.join(parentDir, `.${backupName}.previous`);

  try {
    copyDirectory(dataHome, path.join(temporaryDir, path.basename(dataHome)));
    const flydonBackupDir = path.join(temporaryDir, path.basename(flydonDir));
    copyDirectory(flydonDir, flydonBackupDir);

    const databasePath = path.join(flydonBackupDir, "chat.sqlite");
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}-wal`, { force: true });
    rmSync(`${databasePath}-shm`, { force: true });
    store.backupDatabase(databasePath);

    rmSync(previousDir, { recursive: true, force: true });
    if (existsSync(backupDir)) renameSync(backupDir, previousDir);
    try {
      renameSync(temporaryDir, backupDir);
    } catch (error) {
      if (existsSync(previousDir)) renameSync(previousDir, backupDir);
      throw error;
    }
    rmSync(previousDir, { recursive: true, force: true });
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true });
  }

  return backupDir;
}

function copyDirectory(source: string, destination: string) {
  if (!existsSync(source)) {
    mkdirSync(destination, { recursive: true });
    return;
  }
  cpSync(source, destination, { recursive: true, preserveTimestamps: true });
}
