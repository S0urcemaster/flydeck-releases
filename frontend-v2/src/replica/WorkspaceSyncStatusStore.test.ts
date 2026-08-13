import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceSyncStatusStore } from "./WorkspaceSyncStatusStore";

describe("WorkspaceSyncStatusStore", () => {
  afterEach(() => vi.useRealTimers());

  it("publishes global offline and recovery transitions", () => {
    const store = new WorkspaceSyncStatusStore(false);
    const listener = vi.fn();
    store.subscribe(listener);

    store.markOffline("network failed");
    expect(store.getSnapshot()).toEqual({
      state: "offline",
      reason: "network failed",
    });

    store.markOnline();
    expect(store.getSnapshot()).toEqual({ state: "idle" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("distinguishes a local replica failure from offline transport", () => {
    const store = new WorkspaceSyncStatusStore(false);

    store.markError("IndexedDB unavailable");

    expect(store.getSnapshot()).toEqual({
      state: "error",
      reason: "IndexedDB unavailable",
      pending: 0,
    });
  });

  it("keeps test mode offline until it is explicitly disabled", () => {
    const store = new WorkspaceSyncStatusStore(false);

    store.setForcedOffline(true);
    store.markOnline();

    expect(store.isForcedOffline()).toBe(true);
    expect(store.getSnapshot()).toEqual({
      state: "offline",
      reason: "Offline test mode is enabled.",
    });

    store.setForcedOffline(false);
    expect(store.getSnapshot()).toEqual({ state: "idle" });
  });

  it("aggregates pending transactions across workspace scopes", () => {
    const store = new WorkspaceSyncStatusStore(false);

    store.setPendingCount("one", 2);
    store.setPendingCount("two", 3);
    expect(store.getPendingCount()).toBe(5);

    store.setPendingCount("one", 0);
    expect(store.getPendingCount()).toBe(3);
  });

  it("shows cached for at least half a second before saved", () => {
    vi.useFakeTimers();
    const store = new WorkspaceSyncStatusStore(false);

    store.markCommandCached("command-1");
    store.markCommandSaved("command-1");

    expect(store.getActivitySnapshot()).toEqual({ message: "cached..." });
    vi.advanceTimersByTime(499);
    expect(store.getActivitySnapshot()).toEqual({ message: "cached..." });
    vi.advanceTimersByTime(1);
    expect(store.getActivitySnapshot()).toEqual({ message: "saved" });
  });

  it("groups multiple mutations of one user command", () => {
    vi.useFakeTimers();
    const store = new WorkspaceSyncStatusStore(false);

    store.markCommandCached("batch-1");
    store.markCommandCached("batch-1");
    store.markCommandSaved("batch-1");
    vi.advanceTimersByTime(500);
    expect(store.getActivitySnapshot()).toEqual({ message: "cached..." });

    store.markCommandSaved("batch-1");
    vi.runOnlyPendingTimers();
    expect(store.getActivitySnapshot()).toEqual({ message: "saved" });
  });

  it("shows queued work offline and one recovery confirmation", () => {
    vi.useFakeTimers();
    const store = new WorkspaceSyncStatusStore(false);

    store.markCommandCached("command-1");
    store.markOffline("network failed");
    vi.advanceTimersByTime(500);
    expect(store.getActivitySnapshot()).toEqual({ message: "in queue" });

    store.markCommandSaved("command-1", false);
    store.markOnline();
    store.markQueueSaved();
    expect(store.getActivitySnapshot()).toEqual({ message: "queue saved" });
  });
});
