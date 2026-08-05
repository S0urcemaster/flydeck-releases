import { describe, expect, it } from "vitest";

import { defaultLabTokenValues } from "../../tokenDefinitions";
import { parseTokenText, renderTokenText } from "./TokenEditor";

describe("TokenEditor", () => {
  it("renders and parses uppercase token names", () => {
    const text = renderTokenText(defaultLabTokenValues)
      .replace("SPACE_XS = 3px", "SPACE_XS = 5px")
      .replace(
        "BORDER_STANDARD = 1px solid COLOR_BORDER",
        "BORDER_STANDARD = 2px dashed COLOR_ACCENT_TWO",
      );
    const parsed = parseTokenText(text, defaultLabTokenValues);

    expect(parsed.spaceXs).toBe(5);
    expect(parsed.borderStandard).toBe("2px dashed COLOR_ACCENT_TWO");
  });

  it("renders units and strings without JSON quotes", () => {
    const text = renderTokenText(defaultLabTokenValues);

    expect(text).toContain("BUTTON_WIDTH = 44px");
    expect(text).toContain("ITEM_FONTSIZE = 20px");
    expect(text).toContain("SPACE_XS = 3px");
    expect(text).toContain("BORDER_STANDARD = 1px solid COLOR_BORDER");
    expect(text).not.toContain('"1px solid COLOR_BORDER"');
  });
});
