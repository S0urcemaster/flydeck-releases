import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CycleButton } from "./CycleButton";

describe("CycleButton", () => {
  it("renders the current option followed by the remaining cycle", () => {
    expect(renderToStaticMarkup(
      <CycleButton
        options={["S", "M", "L"]}
        value="S"
        onChange={() => undefined}
      />,
    )).toContain("S <small>M L</small>");
    expect(renderToStaticMarkup(
      <CycleButton
        options={["S", "M", "L"]}
        value="M"
        onChange={() => undefined}
      />,
    )).toContain("M <small>L S</small>");
  });

  it("accepts a separate action for the displayed value", () => {
    expect(renderToStaticMarkup(
      <CycleButton
        options={["!", "?", "%"]}
        value="!"
        onChange={() => undefined}
        onPress={() => undefined}
      />,
    )).toContain("! <small>? %</small>");
  });
});
