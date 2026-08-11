import { describe, expect, it, vi } from "vitest";

import {
  ClientStateStore,
  getClientDeviceId,
  getLastClientIdentity,
  setLastClientIdentity,
  type ClientStateSlice,
} from "./ClientStateStore";

const stringSlice: ClientStateSlice<string> = {
  name: "draft",
  version: 1,
  defaultValue: "",
  validate: (value): value is string => typeof value === "string",
  legacyKeys: ["old.draft"],
};

describe("ClientStateStore", () => {
  it("migrates a legacy key into the scoped versioned namespace", () => {
    const values = new Map([["old.draft", JSON.stringify("legacy")]]);
    const store = new ClientStateStore({
      storage: () => ({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      }),
    });

    expect(store.get(stringSlice)).toBe("legacy");
    expect(values.get(store.getKey("draft"))).toBe(JSON.stringify({
      version: 1,
      value: "legacy",
    }));
    expect(values.get("old.draft")).toBe(JSON.stringify("legacy"));
  });

  it("notifies same-tab subscribers after a valid write", () => {
    const listener = vi.fn();
    const store = new ClientStateStore({ storage: () => null });
    store.subscribe(stringSlice, listener);

    store.set(stringSlice, "next");

    expect(store.get(stringSlice)).toBe("next");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("isolates values by user, workspace, and device", () => {
    const store = new ClientStateStore({ storage: () => null });
    const first = { userId: "user-a", workspaceId: "one", deviceId: "phone" };
    const second = { userId: "user-a", workspaceId: "two", deviceId: "phone" };

    store.set(stringSlice, "first", first);

    expect(store.get(stringSlice, first)).toBe("first");
    expect(store.get(stringSlice, second)).toBe("");
    expect(store.getKey("draft", first)).not.toBe(store.getKey("draft", second));
  });

  it("creates and reuses a persistent device id", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(getClientDeviceId(storage, () => "device-one")).toBe("device-one");
    expect(getClientDeviceId(storage, () => "device-two")).toBe("device-one");
  });

  it("persists only the non-secret identity needed to locate an offline replica", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const identity = { userId: "user-a", workspaceId: "workspace-a" };

    expect(setLastClientIdentity(identity, storage)).toBe(true);
    expect(getLastClientIdentity(storage)).toEqual(identity);
  });
});
