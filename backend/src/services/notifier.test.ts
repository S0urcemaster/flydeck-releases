import { afterEach, describe, expect, it, vi } from "vitest";
import { NtfyNotifier } from "./notifier.js";

describe("ntfy notifier", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds https to a host without a protocol", async () => {
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new NtfyNotifier({ ntfyUrl: "ntfy.sh", ntfyTopic: "test-topic" }).sendTimer("Test");
    expect(fetchMock).toHaveBeenCalledWith("https://ntfy.sh/test-topic", expect.any(Object));
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps an explicitly configured protocol", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new NtfyNotifier({ ntfyUrl: "http://localhost:8080/", ntfyTopic: "test-topic" }).sendTimer("Test");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/test-topic", expect.any(Object));
  });
});
