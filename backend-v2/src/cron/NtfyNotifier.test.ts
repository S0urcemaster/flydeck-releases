import { afterEach, describe, expect, it, vi } from "vitest";

import { NtfyNotifier } from "./NtfyNotifier.js";

afterEach(() => vi.unstubAllGlobals());

describe("NtfyNotifier", () => {
  it("hands future reminders to ntfy with an exact delivery time", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const deliveryAt = new Date(Date.now() + 120_000);

    await new NtfyNotifier({ ntfyUrl: "https://ntfy.sh", ntfyTopic: "topic" })
      .sendTimer("Reminder", deliveryAt, "schedule-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ntfy.sh/topic/schedule-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          At: String(Math.floor(deliveryAt.getTime() / 1_000)),
          Priority: "high",
        }),
      }),
    );
  });
});
