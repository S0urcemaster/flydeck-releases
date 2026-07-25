import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { CronStore } from "./storage/cronStore.js";
import { NtfyNotifier } from "./services/notifier.js";
import { CronScheduler } from "./services/cronScheduler.js";
import { config as loadEnvFile } from "dotenv";

loadEnvFile({ path: new URL("../.env", import.meta.url), quiet: true });

const config = loadConfig();
const cronStore = new CronStore(config);
const app = await createApp(config, cronStore);
const scheduler = new CronScheduler(cronStore, new NtfyNotifier(config), config.schedulerIntervalMs);
scheduler.start();

app.listen(config.port, "0.0.0.0", () => {
  console.info(`Flydeck backend listening on http://0.0.0.0:${config.port}${config.basePath}`);
});
