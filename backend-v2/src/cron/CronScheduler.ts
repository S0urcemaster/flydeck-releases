import type { CronService } from "./CronService.js";

type TimerNotifier = { sendTimer(title: string): Promise<void> };

export class CronScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly cron: CronService,
    private readonly notifier: TimerNotifier,
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
      for (;;) {
        const timers = await this.cron.claimDueTimers(20);
        if (timers.length === 0) break;
        for (const timer of timers) {
          try {
            await this.notifier.sendTimer(timer.title);
            await this.cron.completeNotification(timer.id);
            console.info(`Timer expired: ${timer.title}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.cron.failNotification(timer.id, message);
            console.error(`Timer notification failed: ${timer.title}`, error);
          }
        }
        if (timers.length < 20) break;
      }
    } finally {
      this.running = false;
    }
  }
}
