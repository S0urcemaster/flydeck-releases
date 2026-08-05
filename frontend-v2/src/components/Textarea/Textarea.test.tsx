import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("owns its size and resize variants", () => {
    const markup = renderToStaticMarkup(
      <Textarea aria-label="Result" resize="none" size="large" readOnly />,
    );

    expect(markup).toContain("<textarea");
    expect(markup).toContain('data-resize="none"');
    expect(markup).toContain('data-size="large"');
    expect(markup).toContain('readOnly=""');
  });

  it("exposes the double-height properties variant", () => {
    expect(renderToStaticMarkup(<Textarea size="properties" />)).toContain(
      'data-size="properties"',
    );
  });
});
