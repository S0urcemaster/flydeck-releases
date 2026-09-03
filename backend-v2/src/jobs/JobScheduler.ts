import type { JobService } from "./JobService.js";

export class JobScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly jobs: JobService,
    private readonly intervalMs: number,
  ) {}

  start() {
    void this.tick();
    this.interval = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      while (await this.jobs.runDueJobs(20) === 20) {
        // Drain all currently due jobs in bounded batches.
      }
    } finally {
      this.running = false;
    }
  }
}
