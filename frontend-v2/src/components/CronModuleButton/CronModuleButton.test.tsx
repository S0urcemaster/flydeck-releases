import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CronModuleButton } from "./CronModuleButton";

describe("CronModuleButton", () => {
  it("owns its label and character", () => {
    const markup = renderToStaticMarkup(<CronModuleButton symbol="◷" />);
    expect(markup).toContain("◷");
    expect(markup).toContain("CRON");
  });
});
