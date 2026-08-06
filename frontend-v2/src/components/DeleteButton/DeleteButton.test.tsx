import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeleteButton } from "./DeleteButton";

describe("DeleteButton", () => {
  it("renders as a self-contained timeout button", () => {
    const markup = renderToStaticMarkup(
      <DeleteButton
        label="Rose"
        onDelete={() => undefined}
        armedColor="COLOR_ERROR"
        timeout={500}
      />,
    );

    expect(markup).toContain('data-component-name="DeleteButton"');
    expect(markup).toContain('aria-label="Arm delete for Rose"');
    expect(markup).toContain(">×</button>");
  });

  it("can expose the same confirmation behavior for reset actions", () => {
    const markup = renderToStaticMarkup(
      <DeleteButton action="reset" label="Page color" onDelete={() => undefined}>
        RESET
      </DeleteButton>,
    );

    expect(markup).toContain('aria-label="Arm reset for Page color"');
    expect(markup).toContain(">RESET</button>");
  });
});
