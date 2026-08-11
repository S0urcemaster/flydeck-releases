import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InputControl } from "./InputControl";

describe("InputControl", () => {
  it("composes a textarea prepared for the focus keyboard", () => {
    const markup = renderToStaticMarkup(
      <InputControl border="none" initialValue="Draft" />,
    );

    expect(markup).toContain('data-component-name="InputControl"');
    expect(markup).toContain('aria-label="Content input"');
    expect(markup).toContain('inputMode="none"');
    expect(markup).not.toContain('aria-label="Save content"');
    expect(markup).toContain("border:none");
  });

  it("wraps a one-line input with the same keyboard contract", () => {
    const markup = renderToStaticMarkup(
      <InputControl control="input" initialValue="Name" />,
    );

    expect(markup).toContain("<input");
    expect(markup).toContain('aria-label="Content input"');
    expect(markup).toContain('inputMode="none"');
    expect(markup).not.toContain("<textarea");
  });

  it("accepts a controlled value", () => {
    const markup = renderToStaticMarkup(
      <InputControl initialValue="Ignored" value="Controlled" />,
    );

    expect(markup).toContain("Controlled");
    expect(markup).not.toContain("Ignored");
  });
});
