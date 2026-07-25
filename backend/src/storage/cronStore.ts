import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { cronTimerSchema, type CreateCronTimerRequest, type CronTimer } from "@flydeck/shared/cron";
import type { AppConfig } from "../config.js";
import { HttpError } from "../errors.js";
import { parseMarkdownData, serializeMarkdownData } from "./markdownFormat.js";
import { AtomicFileStore } from "./atomicFileStore.js";

export class CronStore {
  private readonly filePath: string;
  private readonly files = new AtomicFileStore();

  constructor(private readonly config: AppConfig) {
    this.filePath = path.join(config.flydonDir, "cron.md");
  }

  async initialize() {
    await mkdir(this.config.flydonDir, { recursive: true });
    await mkdir(this.config.trashDir, { recursive: true });
    try {
      await access(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await this.files.runExclusive(this.filePath, () => this.files.write(this.filePath, this.serialize([])));
    }
  }

  async list() {
    const timers = await this.readAll();
    return timers.sort((left, right) => {
      if (left.status !== right.status) return left.status === "active" ? -1 : 1;
      const direction = left.status === "active" ? 1 : -1;
      return direction * left.dueAt.localeCompare(right.dueAt);
    });
  }

  async create(input: CreateCronTimerRequest, now = new Date()) {
    if (new Date(input.dueAt).getTime() <= now.getTime()) {
      throw new HttpError(400, "INVALID_DUE_DATE", "Timer must be in the future");
    }
    return this.files.runExclusive(this.filePath, async () => {
      const timers = await this.readAll();
      if (timers.some((timer) => timer.title.toLocaleLowerCase("de") === input.title.toLocaleLowerCase("de"))) {
        throw new HttpError(409, "TIMER_EXISTS", `Timer ${input.title} already exists`);
      }
      const timer: CronTimer = {
        id: randomUUID(), title: input.title, dueAt: input.dueAt, createdAt: now.toISOString(), status: "active",
      };
      await this.persist([...timers, timer]);
      return timer;
    });
  }

  async remove(id: string) {
    return this.files.runExclusive(this.filePath, async () => {
      const timers = await this.readAll();
      const timer = timers.find((current) => current.id === id);
      if (!timer) throw new HttpError(404, "TIMER_NOT_FOUND", "Timer was not found");
      await this.persist(timers.filter((current) => current.id !== id));
      return { id };
    });
  }

  async updateDueAt(id: string, dueAt: string, now = new Date()) {
    if (new Date(dueAt).getTime() <= now.getTime()) {
      throw new HttpError(400, "INVALID_DUE_DATE", "Timer must be in the future");
    }
    return this.files.runExclusive(this.filePath, async () => {
      const timers = await this.readAll();
      const index = timers.findIndex((timer) => timer.id === id);
      if (index < 0) throw new HttpError(404, "TIMER_NOT_FOUND", "Timer was not found");
      if (timers[index].status !== "active") throw new HttpError(409, "TIMER_EXPIRED", "Expired timer cannot be changed");
      const updated: CronTimer = { ...timers[index], dueAt };
      await this.persist(timers.map((timer, currentIndex) => currentIndex === index ? updated : timer));
      return updated;
    });
  }

  async due(now = new Date()) {
    return (await this.readAll()).filter((timer) => timer.status === "active" && new Date(timer.dueAt) <= now);
  }

  async markExpired(id: string) {
    return this.files.runExclusive(this.filePath, async () => {
      const timers = await this.readAll();
      const index = timers.findIndex((timer) => timer.id === id);
      if (index < 0) throw new HttpError(404, "TIMER_NOT_FOUND", "Timer was not found");
      const expired: CronTimer = { ...timers[index], status: "expired" };
      await this.persist(timers.map((timer, currentIndex) => currentIndex === index ? expired : timer));
      return expired;
    });
  }

  private async readAll(): Promise<CronTimer[]> {
    const parsed = parseMarkdownData(await readFile(this.filePath, "utf8"));
    return parsed.entries.map((line, index) => {
      try {
        return cronTimerSchema.parse(JSON.parse(line));
      } catch {
        throw new HttpError(422, "INVALID_CRON_FILE", `Invalid timer on line ${index + 1}`);
      }
    });
  }

  private serialize(timers: CronTimer[]) {
    return serializeMarkdownData({
      preamble: ["# Cron Timer", "", "format: json-lines", ""],
      entries: timers.map((timer) => JSON.stringify(timer)),
    });
  }

  private async persist(timers: CronTimer[]) {
    await this.files.backupAndWrite(this.filePath, this.serialize(timers), this.config.trashDir, "cron.md");
  }
}
