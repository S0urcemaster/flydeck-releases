import { describe, expect, it } from "vitest";

import {
  assertImagesAllowed,
  assertItemTextAllowed,
  assertTreeItemCapacity,
  trialItemContentLimit,
} from "./accountPolicy.js";

describe("trial account policy", () => {
  it("allows the twentieth item but rejects another one", () => {
    expect(() => assertTreeItemCapacity("probe", 19)).not.toThrow();
    expect(() => assertTreeItemCapacity("probe", 20)).toThrow(/at most 20/);
    expect(() => assertTreeItemCapacity("guest", 20)).not.toThrow();
  });

  it("rejects images only for trial accounts", () => {
    expect(() => assertImagesAllowed("probe")).toThrow(/unavailable/);
    expect(() => assertImagesAllowed("guest")).not.toThrow();
    expect(() => assertImagesAllowed("test")).not.toThrow();
  });

  it("limits trial item titles and text", () => {
    expect(() => assertItemTextAllowed("probe", {
      label: "t".repeat(100), content: "c".repeat(trialItemContentLimit),
    })).not.toThrow();
    expect(() => assertItemTextAllowed("probe", { label: "t".repeat(101) }))
      .toThrow(/at most 100/);
    expect(() => assertItemTextAllowed("probe", { content: "c".repeat(trialItemContentLimit + 1) }))
      .toThrow(/at most 250000/);
    expect(() => assertItemTextAllowed("guest", {
      label: "t".repeat(101), content: "c".repeat(501),
    })).not.toThrow();
  });
});
