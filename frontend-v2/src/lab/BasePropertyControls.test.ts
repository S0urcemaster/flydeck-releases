import { describe, expect, it } from "vitest";

import {
  parseBasePropertyText,
  parseOwnProperties,
  renderBasePropertyText,
  renderPropertyText,
  toBaseStyleProps,
  type BaseLabValues,
} from "./BasePropertyControls";

const values: BaseLabValues = {
  color: "COLOR_TEXT_MUTED",
  background: "inherit",
  border: "1px solid COLOR_BORDER",
  padding: "SPACE_SM",
  margin: "0 auto",
  width: "unset",
  height: "10rem",
};

describe("Base lab properties", () => {
  it("keeps inherit, CSS variables, and individual values in preview props", () => {
    expect(toBaseStyleProps(values)).toEqual(values);
  });

  it("round-trips inherited properties through the textarea format", () => {
    expect(parseBasePropertyText(renderBasePropertyText(values), values)).toEqual(values);
  });

  it("can omit a fixed base property from component props", () => {
    const text = renderPropertyText(
      "AppStatusLine",
      { error: false },
      values,
      {},
      [],
      ["color"],
    );

    expect(text).not.toContain("color =");
    expect(text).not.toContain("# color:");
  });

  it("accepts an individual CSS value containing spaces", () => {
    expect(parseBasePropertyText("margin = 1rem auto", values).margin).toBe(
      "1rem auto",
    );
  });

  it("parses typed component properties", () => {
    expect(parseOwnProperties(
      '# component: Example\ntitle = "Flydeck"\nenabled = false',
      { title: "", enabled: true },
    )).toEqual({ title: "Flydeck", enabled: false });
  });

  it("renders and parses string component properties without quotes", () => {
    const text = renderPropertyText(
      "TreeBrowser",
      { rowGap: "SPACE_XS" },
      values,
    );

    expect(text).toContain("rowGap = SPACE_XS");
    expect(text).not.toContain('rowGap = "SPACE_XS"');
    expect(parseOwnProperties(text, { rowGap: "" })).toEqual({
      rowGap: "SPACE_XS",
    });
  });
});
