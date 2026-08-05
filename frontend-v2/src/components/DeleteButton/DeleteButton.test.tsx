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
});
