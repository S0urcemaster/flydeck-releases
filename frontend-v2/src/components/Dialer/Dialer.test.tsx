import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Dialer, positionFromAngle } from "./Dialer";

describe("Dialer", () => {
  it("owns five buttons and two dial surfaces", () => {
    const markup = renderToStaticMarkup(
      <Dialer
        topLeftLabel="A"
        topRightLabel="B"
        bottomLeftLabel="C"
        bottomRightLabel="D"
        centerLabel="E"
        buttonProps={{ width: "91px" }}
        centerButtonProps={{ width: "37px" }}
      />,
    );

    expect(markup.match(/<button/g)).toHaveLength(7);
    expect(markup.match(/width:91px/g)).toHaveLength(4);
    expect(markup).toContain("width:37px");
    expect(markup.match(/data-component-name="DialerButton"/g)).toHaveLength(4);
    expect(markup).toContain('data-component-name="DialerCenterButton"');
    expect(markup).toContain('data-layer="outer"');
    expect(markup).toContain('data-layer="inner"');
    expect(markup).toContain('data-dial-reference="range-boundary"');
    expect(markup).toContain('data-dial-reference="zero-point"');
    expect(markup.match(/data-angle-origin="north"/g)).toHaveLength(2);
  });

  it("keeps its visual marker just inside the selected tangent", () => {
    expect(positionFromAngle(0)).toEqual({
      x: 0.5,
      y: 0.030000000000000027,
      radius: 0.94,
      angle: 0,
    });
  });
});
