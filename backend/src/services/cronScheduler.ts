import type { AppConfig } from "../config.js";
import type { CronStore } from "../storage/cronStore.js";
type TimerNotifier = { sendTimer: (title: string) => Promise<void> };

export class CronScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;
  private readonly scheduled = new Map<string, { dueAt: string; timeout: NodeJS.Timeout }>();
  private readonly notifying = new Set<string>();

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
    for (const scheduled of this.scheduled.values()) clearTimeout(scheduled.timeout);
    this.scheduled.clear();
  }

  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const horizon = now.getTime() + this.intervalMs;
      const activeTimers = (await this.store.list()).filter((timer) => timer.status === "active");
      const activeById = new Map(activeTimers.map((timer) => [timer.id, timer]));
      for (const [id, scheduled] of this.scheduled) {
        const timer = activeById.get(id);
        if (!timer || timer.dueAt !== scheduled.dueAt || new Date(timer.dueAt).getTime() > horizon) {
          clearTimeout(scheduled.timeout);
          this.scheduled.delete(id);
        }
      }
      const timers = activeTimers.filter((timer) => new Date(timer.dueAt).getTime() <= horizon);
      for (const timer of timers) {
        const delay = new Date(timer.dueAt).getTime() - now.getTime();
        if (delay <= 0) {
          await this.notify(timer.id, timer.title);
        } else if (!this.scheduled.has(timer.id) && !this.notifying.has(timer.id)) {
          const timeout = setTimeout(() => {
            this.scheduled.delete(timer.id);
            void this.notify(timer.id, timer.title);
          }, delay);
          this.scheduled.set(timer.id, { dueAt: timer.dueAt, timeout });
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async notify(id: string, title: string) {
    if (this.notifying.has(id)) return;
    this.notifying.add(id);
    try {
      const due = (await this.store.due()).some((timer) => timer.id === id);
      if (!due) return;
      await this.notifier.sendTimer(title);
      await this.store.markExpired(id);
      console.info(`Timer expired: ${title}`);
    } catch (error) {
      console.error(`Timer notification failed: ${title}`, error);
    } finally {
      this.notifying.delete(id);
    }
  }
}
