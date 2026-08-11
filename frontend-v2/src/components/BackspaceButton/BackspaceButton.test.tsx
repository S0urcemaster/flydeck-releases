import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BackspaceButton } from "./BackspaceButton";

describe("BackspaceButton", () => {
  it("renders a focus-preserving press and repeat control", () => {
    const markup = renderToStaticMarkup(
      <BackspaceButton onPress={() => undefined} />,
    );

    expect(markup).toContain('data-component-name="BackspaceButton"');
    expect(markup).toContain('aria-label="Backspace"');
    expect(markup).toContain("lucide-delete");
  });
});
