import type { AppConfig } from "../config.js";
import type { CronStore } from "../storage/cronStore.js";
type TimerNotifier = { sendTimer: (title: string) => Promise<void> };

export class CronScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly store: CronStore,
    private readonly notifier: TimerNotifier,
    private readonly intervalMs: number,
  ) {}

  start() {
    void this.tick();
    this.interval = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      for (const timer of await this.store.due(now)) {
        try {
          await this.notifier.sendTimer(timer.title);
          await this.store.markExpired(timer.id);
          console.info(`Timer expired: ${timer.title}`);
        } catch (error) {
          console.error(`Timer notification failed: ${timer.title}`, error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
