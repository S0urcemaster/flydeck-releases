import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SubmoduleButton } from "./SubmoduleButton";

describe("SubmoduleButton", () => {
  it("composes Button with the subordinate accent", () => {
    const markup = renderToStaticMarkup(
      <SubmoduleButton selected>MEMO</SubmoduleButton>,
    );
    expect(markup).toContain("MEMO");
    expect(markup).toContain("var(--color-accent-two)");
  });
});
