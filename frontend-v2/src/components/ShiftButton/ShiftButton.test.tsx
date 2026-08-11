import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShiftButton } from "./ShiftButton";

describe("ShiftButton", () => {
  it("renders its mode and locked state through LongPressButton", () => {
    const markup = renderToStaticMarkup(
      <ShiftButton
        locked
        mode="upper"
        onCycle={() => undefined}
        onLock={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="ShiftButton"');
    expect(markup).toContain('data-shift-mode="upper"');
    expect(markup).toContain('data-shift-locked="true"');
    expect(markup).toContain("Shift locked in upper layout; press to unlock");
    expect(markup).toContain("lucide-arrow-big-up");
    expect(markup).not.toContain("lucide-arrow-big-up-dash");

    const symbols = renderToStaticMarkup(
      <ShiftButton
        locked={false}
        mode="symbols"
        onCycle={() => undefined}
        onLock={() => undefined}
      />,
    );
    expect(symbols).toContain("lucide-arrow-big-up-dash");
  });
});
