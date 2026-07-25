import { afterEach, describe, expect, it, vi } from "vitest";
import { NtfyNotifier } from "./notifier.js";

describe("ntfy notifier", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds https to a host without a protocol", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new NtfyNotifier({ ntfyUrl: "ntfy.sh", ntfyTopic: "test-topic" }).sendTimer("Test");
    expect(fetchMock).toHaveBeenCalledWith("https://ntfy.sh/test-topic", expect.any(Object));
  });

  it("keeps an explicitly configured protocol", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new NtfyNotifier({ ntfyUrl: "http://localhost:8080/", ntfyTopic: "test-topic" }).sendTimer("Test");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/test-topic", expect.any(Object));
  });
});
