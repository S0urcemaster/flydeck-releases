import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DialButton } from "./DialButton";

describe("DialButton", () => {
  it("shows the first dial value and its alternatives", () => {
    const markup = renderToStaticMarkup(
      <DialButton
        options={["€", "$"]}
        onDial={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="DialButton"');
    expect(markup).toContain("€ <small>$</small>");
  });
});
