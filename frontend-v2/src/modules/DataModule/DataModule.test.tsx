import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataModule } from "./DataModule";

describe("DataModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(<DataModule padding="SPACE_SM" />);
    expect(markup).toContain('aria-label="Data module"');
    expect(markup).toContain('data-component-name="DataBrowser"');
    expect(markup).toContain("Data");
  });
});
