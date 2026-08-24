import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DIAL_BUTTON_TIMEOUT, DialButton } from "./DialButton";

describe("DialButton", () => {
  it("uses the shortened shared multi-tap timeout", () => {
    expect(DIAL_BUTTON_TIMEOUT).toBe(500);
  });

  it("shows the first dial value and its alternatives", () => {
    const markup = renderToStaticMarkup(
      <DialButton
        options={["€", "$"]}
        onDial={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="DialButton"');
    expect(markup).toContain(">$</small>");
  });
});
