import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  LongPressButton,
  resolveLongPressTimeout,
} from "./LongPressButton";

describe("LongPressButton", () => {
  it("renders a dedicated reusable button", () => {
    const markup = renderToStaticMarkup(
      <LongPressButton onPress={() => undefined} onLongPress={() => undefined}>
        HOLD
      </LongPressButton>,
    );

    expect(markup).toContain('data-component-name="LongPressButton"');
  });

  it("renders its long-press function on a secondary line", () => {
    const markup = renderToStaticMarkup(
      <LongPressButton
        onPress={() => undefined}
        onLongPress={() => undefined}
        secondary="SECONDARY"
      >
        PRIMARY
      </LongPressButton>,
    );

    expect(markup).toContain(">PRIMARY</span>");
    expect(markup).toContain(">SECONDARY</small>");
  });

  it("uses an explicit timeout and a stable fallback", () => {
    expect(resolveLongPressTimeout(null, 800)).toBe(800);
    expect(resolveLongPressTimeout(null)).toBe(500);
  });
});
