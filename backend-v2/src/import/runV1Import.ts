import "../environment.js";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db/database.js";
import { runMigrations } from "../db/migrations.js";
import { importV1 } from "./v1Import.js";

const options = readOptions(process.argv.slice(2));
const database = createDatabase(loadConfig());

try {
  await runMigrations(database);
  const summary = await importV1(database, options);
  console.info(JSON.stringify(summary, null, 2));
} finally {
  await database.end();
}

function readOptions(arguments_: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!name?.startsWith("--") || !value || value.startsWith("--")) {
      throw usageError();
    }
    values.set(name.slice(2), value);
  }

  const workspaceId = values.get("workspace-id")
    ?? process.env.FLYDECK_IMPORT_WORKSPACE_ID;
  const userId = values.get("user-id") ?? process.env.FLYDECK_IMPORT_USER_ID;
  if (!workspaceId || !userId) throw usageError();

  return {
    workspaceId,
    userId,
    dataDirectory: values.get("data-dir")
      ?? process.env.FLYDECK_V1_DATA_HOME
      ?? path.join(os.homedir(), "flydesk-data"),
    cronFile: values.get("cron-file")
      ?? process.env.FLYDECK_V1_CRON_FILE
      ?? path.join(os.homedir(), ".flydon", "cron.md"),
  };
}

function usageError() {
  return new Error(
    "Usage: npm run import:v1 --workspace flydeck-backend-v2 -- "
      + "--workspace-id <uuid> --user-id <uuid> "
      + "[--data-dir <path>] [--cron-file <path>]",
  );
}
