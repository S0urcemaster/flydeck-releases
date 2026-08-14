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
      space: 5,
    });

    expect(values).toEqual({
      ...defaultLabTokenValues,
      space: 5,
    });
    expect(renderLabTokens(values!)).toContain("--space: 5px;");
    expect(renderLabTokens(values!)).toContain("--space-sm: calc(var(--space) * 2);");
    expect(renderLabTokens(values!)).toContain(
      "--border-standard: 1px solid var(--color-border);",
    );
    expect(renderLabTokens(values!)).toContain(
      "--listcontrol-orientation: bottom;",
    );
  });

  it("rejects unknown, incomplete, and out-of-range values", () => {
    expect(parseLabTokenValues({ ...defaultLabTokenValues, unknown: 1 })).toBeNull();
    expect(parseLabTokenValues({})).toBeNull();
    expect(parseLabTokenValues({ ...defaultLabTokenValues, space: 13 })).toBeNull();
    expect(parseLabTokenValues({
      ...defaultLabTokenValues,
      listControlOrientation: "left",
    })).toBeNull();
    expect(parseLabTokenValues({
      ...defaultLabTokenValues,
      borderStandard: "1 px solid COLOR_BORDER",
    })).toBeNull();
  });
});
