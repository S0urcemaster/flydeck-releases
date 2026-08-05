import { describe, expect, it, vi } from "vitest";

import { ClientStateStore, type ClientStateSlice } from "./ClientStateStore";

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
});
