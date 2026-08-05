import { describe, expect, it, vi } from "vitest";
import { CronScheduler } from "./CronScheduler.js";
import type { CronService } from "./CronService.js";

describe("CronScheduler", () => {
  it("notifies and expires claimed timers", async () => {
    const cron = {
      claimDueTimers: vi.fn()
        .mockResolvedValueOnce([{ id: "timer-1", title: "Report" }])
        .mockResolvedValueOnce([]),
      completeNotification: vi.fn().mockResolvedValue(undefined),
      failNotification: vi.fn(),
    };
    const notifier = { sendTimer: vi.fn().mockResolvedValue(undefined) };
    const scheduler = new CronScheduler(
      cron as unknown as CronService, notifier, 5_000,
    );

    await scheduler.tick();

    expect(notifier.sendTimer).toHaveBeenCalledWith("Report");
    expect(cron.completeNotification).toHaveBeenCalledWith("timer-1");
    expect(cron.failNotification).not.toHaveBeenCalled();
  });

  it("releases a failed notification for retry", async () => {
    const cron = {
      claimDueTimers: vi.fn()
        .mockResolvedValueOnce([{ id: "timer-1", title: "Report" }])
        .mockResolvedValueOnce([]),
      completeNotification: vi.fn(),
      failNotification: vi.fn().mockResolvedValue(undefined),
    };
    const notifier = { sendTimer: vi.fn().mockRejectedValue(new Error("offline")) };
    const scheduler = new CronScheduler(
      cron as unknown as CronService, notifier, 5_000,
    );

    await scheduler.tick();

    expect(cron.completeNotification).not.toHaveBeenCalled();
    expect(cron.failNotification).toHaveBeenCalledWith("timer-1", "offline");
  });
});
