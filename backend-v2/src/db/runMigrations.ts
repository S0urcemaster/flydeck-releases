import "../environment.js";
import { loadConfig } from "../config.js";
import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";

const database = createDatabase(loadConfig());
try {
  await runMigrations(database);
  console.info("Flydeck backend-v2 migrations applied");
} finally {
  await database.end();
}
