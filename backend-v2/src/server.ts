import "./environment.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/database.js";
import { runMigrations } from "./db/migrations.js";
import { CronService } from "./cron/CronService.js";
import { CronScheduler } from "./cron/CronScheduler.js";
import { NtfyNotifier } from "./cron/NtfyNotifier.js";

const config = loadConfig();
const database = createDatabase(config);
await runMigrations(database);
const scheduler = new CronScheduler(
  new CronService(database),
  new NtfyNotifier(config),
  config.schedulerIntervalMs,
);
scheduler.start();
const app = createApp(config, database);
const server = app.listen(config.port, () => {
  console.info(`Flydeck backend-v2 listening on ${config.port}`);
});

async function shutdown(signal: string) {
  console.info(`Flydeck backend-v2 received ${signal}`);
  scheduler.stop();
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
