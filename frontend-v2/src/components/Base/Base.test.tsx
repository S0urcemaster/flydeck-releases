import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Base, resolveCssValue } from "./Base";

describe("Base", () => {
  it("renders a selected semantic element with style variants", () => {
    const markup = renderToStaticMarkup(
      <Base
        as="section"
        color="COLOR_TEXT_MUTED"
        background="#fff"
        border="1px solid COLOR_BORDER"
        padding="SPACE_SM"
        margin="0"
        width="unset"
        height="42px"
      />,
    );

    expect(markup).toContain("<section");
    expect(markup).toContain("background:#fff");
    expect(markup).toContain("padding:var(--space-sm)");
    expect(markup).toContain("border:1px solid var(--color-border)");
    expect(markup).toContain("color:var(--color-text-muted)");
    expect(markup).not.toContain("width:");
    expect(markup).toContain("height:42px");
  });

  it("reads uppercase CSS variable names as lowercase custom properties", () => {
    expect(resolveCssValue("COLOR_TEXT")).toBe("var(--color-text)");
    expect(resolveCssValue("inherit")).toBe("inherit");
  });

  it("exposes an optional component-name overlay without visible text markup", () => {
    const markup = renderToStaticMarkup(
      <Base componentName="Example" showComponentName />,
    );

    expect(markup).toContain('data-component-name="Example"');
    expect(markup).toContain('data-show-component-name="true"');
    expect(markup).not.toContain(">Example<");
  });
});
