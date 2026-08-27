import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckRadioButton } from "./CheckRadioButton";

describe("CheckRadioButton", () => {
  it("renders independent checked and selected controls", () => {
    const markup = renderToStaticMarkup(
      <CheckRadioButton
        checked
        checkLabel="Hide Cron"
        selectLabel="Store in Cron"
        selected={false}
        onCheckedChange={() => undefined}
        onSelect={() => undefined}
      >
        Cron
      </CheckRadioButton>,
    );

    expect(markup).toContain('data-component-name="CheckRadioButton"');
    expect(markup).toContain('aria-label="Hide Cron"');
    expect(markup).toContain('aria-label="Store in Cron"');
    expect(markup).toContain('role="radio"');
    expect(markup).toContain('aria-checked="false"');
  });
});
