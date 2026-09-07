import "./environment.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/database.js";
import { runMigrations } from "./db/migrations.js";
import { JobStore } from "./jobs/JobStore.js";
import { JobService } from "./jobs/JobService.js";
import { JobScheduler } from "./jobs/JobScheduler.js";
import { PublicationOutbox } from "./publication/PublicationOutbox.js";
import { PublicationSnapshotBuilder } from "./publication/PublicationSnapshotBuilder.js";
import { PublicationWorker } from "./publication/PublicationWorker.js";
import { RelayIngestClient } from "./publication/RelayIngestClient.js";

const config = loadConfig();
const database = createDatabase(config);
await runMigrations(database);
const jobs = new JobService(new JobStore(database));
await jobs.store.markInterrupted();
const jobScheduler = new JobScheduler(jobs, config.schedulerIntervalMs);
jobScheduler.start();
const publicationWorker = config.relayIngestUrl && config.relayIngestSecret
  ? new PublicationWorker(
      new PublicationOutbox(database),
      new PublicationSnapshotBuilder(database, config.imageDirectory!),
      new RelayIngestClient(config.relayIngestUrl, config.relayIngestSecret),
      config.relaySyncIntervalMs,
    )
  : undefined;
publicationWorker?.start();
const app = createApp(config, database, jobs);
const server = app.listen(config.port, () => {
  console.info(`Flydeck backend-v2 listening on ${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Flydeck backend-v2 received ${signal}`);
  jobScheduler.stop();
  const publicationStopped = publicationWorker?.stop();

  const serverClosed = new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // Long-lived job event streams otherwise keep server.close() pending until
  // systemd reaches its stop timeout. Give ordinary requests a brief grace
  // period, then close the remaining connections (primarily SSE clients).
  const forceCloseTimer = setTimeout(() => server.closeAllConnections(), 1_000);
  forceCloseTimer.unref();

  try {
    await serverClosed;
    await publicationStopped;
    clearTimeout(forceCloseTimer);
    await database.end();
    process.exit(0);
  } catch (error) {
    console.error("Flydeck backend-v2 shutdown failed", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
