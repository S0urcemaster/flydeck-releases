import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "./Input";

describe("Input", () => {
  it("composes Base as a text input", () => {
    const markup = renderToStaticMarkup(
      <Input aria-label="Name" width="100%" fontSize="15px" />,
    );

    expect(markup).toContain('data-component-name="Input"');
    expect(markup).toContain('type="text"');
    expect(markup).toContain("width:100%");
    expect(markup).toContain("font-size:15px");
  });

  it("exposes a layout-transparent field for a block-wide Keyboard", () => {
    const markup = renderToStaticMarkup(
      <Input aria-label="Name" keyboard keyboardLayout="block" />,
    );

    expect(markup).toContain('data-keyboard-layout="block"');
    expect(markup).toContain('inputMode="none"');
  });
});
