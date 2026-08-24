import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataBrowser, parseSavedViewPaths } from "./DataBrowser";

describe("DataBrowser", () => {
  it("uses the neutral Data root without demo entries", () => {
    const markup = renderToStaticMarkup(<DataBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="DataBrowser"');
    expect(markup).toContain("Data");
    expect(markup).not.toContain("Documents");
  });

  it("stores view references as unique newline-separated paths", () => {
    expect(parseSavedViewPaths(
      "projects/active\n_system/archive\nprojects/active\n\n",
    )).toEqual(["projects/active", "_system/archive"]);
  });
});
