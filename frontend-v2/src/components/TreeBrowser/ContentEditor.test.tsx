import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ContentEditor } from "./ContentEditor";

describe("ContentEditor", () => {
  it("uses the standard keyboard-backed content input", () => {
    const markup = renderToStaticMarkup(
      <ContentEditor initialValue="Draft" padding="13px" />,
    );

    expect(markup).toContain('data-component-name="ContentEditor"');
    expect(markup).toContain('aria-label="Content input"');
    expect(markup).toContain('inputMode="none"');
    expect(markup).not.toContain('aria-label="Save content"');
    expect(markup).toContain("padding:13px");
  });
});
