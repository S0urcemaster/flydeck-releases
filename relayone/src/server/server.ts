import "./environment.js";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { RelayStore } from "./RelayStore.js";

const config = loadConfig();
const database = createDatabase(config);
const relay = new RelayStore(database, config);
const app = createApp(config, relay);
const server = app.listen(config.port, config.host, () => {
  console.info(`Relay One listening on http://${config.host}:${config.port}`);
});

async function shutdown(signal: string) {
  console.info(`Relay One received ${signal}`);
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
