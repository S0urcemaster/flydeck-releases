import { describe, expect, it } from "vitest";

import {
  defaultLabTokenValues,
  parseLabTokenValues,
  renderLabTokens,
} from "./tokenDefinitions";

describe("lab token definitions", () => {
  it("accepts and renders a declared value", () => {
    const values = parseLabTokenValues({
      ...defaultLabTokenValues,
      appTitleFontSize: 22,
    });

    expect(values).toEqual({
      ...defaultLabTokenValues,
      appTitleFontSize: 22,
    });
    expect(renderLabTokens(values!)).toContain("--app-title-font-size: 22px;");
    expect(renderLabTokens(values!)).toContain("--space-xs: 3px;");
    expect(renderLabTokens(values!)).toContain(
      "--border-standard: 1px solid var(--color-border);",
    );
  });

  it("rejects unknown, incomplete, and out-of-range values", () => {
    expect(parseLabTokenValues({ ...defaultLabTokenValues, unknown: 1 })).toBeNull();
    expect(parseLabTokenValues({})).toBeNull();
    expect(parseLabTokenValues({ appTitleFontSize: 41 })).toBeNull();
    expect(parseLabTokenValues({
      ...defaultLabTokenValues,
      borderStandard: "1 px solid COLOR_BORDER",
    })).toBeNull();
  });
});
