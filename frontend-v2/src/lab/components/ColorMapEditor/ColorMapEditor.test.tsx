import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { ColorMapEditor } from "./ColorMapEditor";

describe("lab ColorMapEditor", () => {
  it("returns a desktop scaffold color editor", () => {
    expect(isValidElement(ColorMapEditor({
      entries: [{ name: "accentOne", label: "Accent one", value: "#2468b2ff" }],
      onChange: () => undefined,
    }))).toBe(true);
  });
});
