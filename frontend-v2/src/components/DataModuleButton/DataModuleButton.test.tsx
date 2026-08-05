import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataModuleButton } from "./DataModuleButton";

describe("DataModuleButton", () => {
  it("owns its label and character", () => {
    const markup = renderToStaticMarkup(<DataModuleButton symbol="◆" />);
    expect(markup).toContain("◆");
    expect(markup).toContain("DATA");
  });
});
