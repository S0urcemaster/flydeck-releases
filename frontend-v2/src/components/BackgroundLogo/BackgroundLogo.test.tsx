import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BackgroundLogo,
  createBackgroundLogoFontSize,
} from "./BackgroundLogo";

describe("BackgroundLogo", () => {
  it("composes Base and exposes its visual properties", () => {
    const markup = renderToStaticMarkup(
      <BackgroundLogo
        symbol="◆"
        fontSizeFactor={0.5}
        opacity={0.2}
        top="-12px"
      />,
    );

    expect(markup).toContain('data-component-name="BackgroundLogo"');
    expect(markup).toContain(
      "--background-logo-font-size:clamp(7rem, 36vw, 14rem)",
    );
    expect(markup).toContain("--background-logo-opacity:0.2");
    expect(markup).toContain("--background-logo-top:-12px");
    expect(markup).toContain(">◆</div>");
  });

  it("scales every clamp boundary by the same factor", () => {
    expect(createBackgroundLogoFontSize(0.8)).toBe(
      "clamp(11.2rem, 57.6vw, 22.4rem)",
    );
  });
});
