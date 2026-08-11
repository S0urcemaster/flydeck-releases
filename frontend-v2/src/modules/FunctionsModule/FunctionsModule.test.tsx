import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FunctionsModule } from "./FunctionsModule";

describe("FunctionsModule", () => {
  it("renders AppBrowser without a DeviceInfo result", () => {
    const markup = renderToStaticMarkup(<FunctionsModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Functions module"');
    expect(markup).toContain('data-component-name="AppBrowser"');
    expect(markup).toContain("System");
    expect(markup).toContain("User");
    expect(markup).not.toContain('aria-label="DeviceInfo result"');
  });
});
