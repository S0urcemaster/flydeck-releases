import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FunctionsModule } from "./FunctionsModule";

describe("FunctionsModule", () => {
  it("renders AppBrowser without a DeviceInfo result", () => {
    const markup = renderToStaticMarkup(<FunctionsModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Functions module"');
    expect(markup).toContain('aria-label="Submodule panel"');
    expect(markup).toContain("BROWSER");
    expect(markup).toContain('data-component-name="AppBrowser"');
    expect(markup).toContain("Compass");
    expect(markup).toContain("Inventory");
    expect(markup).toContain("ShoppingList");
    expect(markup).toContain("Bluesky");
    expect(markup).not.toContain(">Widgets</button>");
    expect(markup).not.toContain(">User</button>");
    expect(markup).not.toContain('aria-label="DeviceInfo result"');
  });
});
