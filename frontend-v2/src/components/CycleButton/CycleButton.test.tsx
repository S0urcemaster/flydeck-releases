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
    )).toContain(">M L</small>");
    expect(renderToStaticMarkup(
      <CycleButton
        options={["S", "M", "L"]}
        value="M"
        onChange={() => undefined}
      />,
    )).toContain(">L S</small>");
  });

  it("accepts a separate action for the displayed value", () => {
    expect(renderToStaticMarkup(
      <CycleButton
        options={["!", "?", "%"]}
        value="!"
        onChange={() => undefined}
        onPress={() => undefined}
      />,
    )).toContain(">? %</small>");
  });

  it("can hide the remaining cycle options", () => {
    const markup = renderToStaticMarkup(
      <CycleButton
        options={["ECON", "MEDI", "HIGH"]}
        showAlternatives={false}
        value="ECON"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain(">ECON</span>");
    expect(markup).not.toContain("<small");
    expect(markup).not.toContain(">MEDI HIGH</small>");
  });
});
