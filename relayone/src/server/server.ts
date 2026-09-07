import "./environment.js";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { RelayStore } from "./RelayStore.js";
import { ProjectedRelayStore } from "./ProjectedRelayStore.js";
import { AssetStore } from "./ingest/AssetStore.js";
import { PublicationIngestService } from "./ingest/PublicationIngestService.js";
import { createBlueskyOAuthBroker } from "./oauth/BlueskyOAuthBroker.js";

const config = loadConfig();
const database = createDatabase(config);
const relay = config.dataSource === "projection"
  ? new ProjectedRelayStore(database, config)
  : new RelayStore(database, config);
const ingest = config.ingestSecret
  ? new PublicationIngestService(database, new AssetStore(config.assetDirectory))
  : undefined;
const oauthBroker = await createBlueskyOAuthBroker(config, database);
const app = createApp(config, relay, ingest, oauthBroker);
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
