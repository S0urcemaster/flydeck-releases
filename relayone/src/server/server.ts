import "./environment.js";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { RelayStore } from "./RelayStore.js";
import { ProjectedRelayStore } from "./ProjectedRelayStore.js";
import { AssetStore } from "./ingest/AssetStore.js";
import { PublicationIngestService } from "./ingest/PublicationIngestService.js";
import { createBlueskyOAuthBroker } from "./oauth/BlueskyOAuthBroker.js";
import { loadOrCreateNodeIdentity } from "./NodeIdentity.js";
import { FederationService } from "./federation/FederationService.js";

const config = loadConfig();
const database = createDatabase(config);
const relay = config.dataSource === "projection"
  ? new ProjectedRelayStore(database, config)
  : new RelayStore(database, config);
const ingest = config.ingestSecret
  ? new PublicationIngestService(database, new AssetStore(config.assetDirectory))
  : undefined;
const oauthBroker = await createBlueskyOAuthBroker(config, database);
const nodeIdentity = await loadOrCreateNodeIdentity(config.identityDirectory, config.nodeId);
const federation = config.capabilities.federation
  ? new FederationService(database, config, nodeIdentity, relay)
  : undefined;
const app = createApp(config, relay, ingest, oauthBroker, nodeIdentity, federation);
const server = app.listen(config.port, config.host, () => {
  console.info(`${config.title} (${config.nodeId}) listening on http://${config.host}:${config.port}`);
});
const federationTimer = federation ? setInterval(() => {
  void federation.syncAll();
}, 60_000) : undefined;
federationTimer?.unref();

async function shutdown(signal: string) {
  console.info(`${config.nodeId} received ${signal}`);
  if (federationTimer) clearInterval(federationTimer);
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
