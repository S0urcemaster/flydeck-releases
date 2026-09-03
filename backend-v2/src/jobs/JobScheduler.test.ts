import { describe, expect, it, vi } from "vitest";
import { JobScheduler } from "./JobScheduler.js";

describe("JobScheduler", () => {
  it("drains complete batches without overlapping ticks", async () => {
    const runDueJobs = vi.fn()
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(3);
    const scheduler = new JobScheduler({ runDueJobs } as never, 5_000);

    await scheduler.tick();

    expect(runDueJobs).toHaveBeenCalledTimes(2);
    expect(runDueJobs).toHaveBeenNthCalledWith(1, 20);
  });
});
