import "./environment.js";

import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { runRelayMigrations } from "./migrations.js";

const database = createDatabase(loadConfig());
try {
  await runRelayMigrations(database);
  console.info("Relay One migrations applied");
} finally {
  await database.end();
}
