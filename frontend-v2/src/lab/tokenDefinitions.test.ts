import { describe, expect, it } from "vitest";

import {
  defaultLabTokenValues,
  parseLabTokenValues,
  renderLabTokens,
} from "./tokenDefinitions";

describe("lab token definitions", () => {
  it("accepts and renders a declared value", () => {
    const values = parseLabTokenValues({ appTitleFontSize: 22 });

    expect(values).toEqual({ appTitleFontSize: 22 });
    expect(renderLabTokens(values!)).toContain("--app-title-font-size: 22px;");
  });

  it("rejects unknown, incomplete, and out-of-range values", () => {
    expect(parseLabTokenValues({ ...defaultLabTokenValues, unknown: 1 })).toBeNull();
    expect(parseLabTokenValues({})).toBeNull();
    expect(parseLabTokenValues({ appTitleFontSize: 41 })).toBeNull();
  });
});
