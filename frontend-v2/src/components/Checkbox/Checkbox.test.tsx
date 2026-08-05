import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders a large accessible checkbox", () => {
    const markup = renderToStaticMarkup(
      <Checkbox
        checked
        color="COLOR_TEXT"
        width="50px"
        height="50px"
        label="Enable USER"
        onChange={() => undefined}
      />,
    );
    expect(markup).toContain('aria-label="Enable USER"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-component-name="Checkbox"');
    expect(markup).toContain("color:var(--color-surface)");
    expect(markup).toContain("width:50px");
    expect(markup).toContain("height:50px");
    expect(markup).toContain('aria-hidden="true">·</span>');
  });

  it("keeps the middle dot visible while unchecked", () => {
    const markup = renderToStaticMarkup(
      <Checkbox
        checked={false}
        label="Enable USER"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("color:var(--color-text)");
    expect(markup).toContain('aria-hidden="true">·</span>');
  });
});
