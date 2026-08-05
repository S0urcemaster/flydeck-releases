import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InputControl } from "./InputControl";

describe("InputControl", () => {
  it("composes a textarea and send button", () => {
    const markup = renderToStaticMarkup(<InputControl initialValue="Draft" />);

    expect(markup).toContain('data-component-name="InputControl"');
    expect(markup).toContain('aria-label="Content input"');
    expect(markup).toContain('aria-label="Send content"');
  });

  it("accepts a controlled value", () => {
    const markup = renderToStaticMarkup(
      <InputControl initialValue="Ignored" value="Controlled" />,
    );

    expect(markup).toContain("Controlled");
    expect(markup).not.toContain("Ignored");
  });
});
