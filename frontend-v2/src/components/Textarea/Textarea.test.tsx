import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("owns its size and resize variants", () => {
    const markup = renderToStaticMarkup(
      <Textarea
        aria-label="Result"
        fontSize="17px"
        resize="none"
        size="large"
        readOnly
      />,
    );

    expect(markup).toContain("<textarea");
    expect(markup).toContain('data-resize="none"');
    expect(markup).toContain('data-size="large"');
    expect(markup).toContain('readOnly=""');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup.match(/font-size:17px/g)).toHaveLength(2);
    expect(markup).toContain(">Result</span>");
  });

  it("exposes the double-height properties variant", () => {
    expect(renderToStaticMarkup(<Textarea size="properties" />)).toContain(
      'data-size="properties"',
    );
  });

  it("exposes a layout-transparent field for a block-wide Keyboard", () => {
    const markup = renderToStaticMarkup(
      <Textarea keyboard keyboardLayout="block" />,
    );

    expect(markup).toContain('data-keyboard-layout="block"');
    expect(markup).toContain('inputMode="none"');
  });

  it("hides its embedded label after ten content characters", () => {
    expect(renderToStaticMarkup(
      <Textarea aria-label="Desc" defaultValue="1234567890" />,
    )).toContain(">Desc</span>");
    expect(renderToStaticMarkup(
      <Textarea aria-label="Desc" defaultValue="12345678901" />,
    )).not.toContain(">Desc</span>");
  });
});
