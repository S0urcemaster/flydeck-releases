import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppTitle } from "./AppTitle";

describe("AppTitle", () => {
  it("returns a reusable title element", () => {
    const title = AppTitle({
      title: "Flydeck",
      subtitle: "Workspace Console · V2",
      fontSize: 24,
      titleTop: -1,
      titleLeft: 2,
      flydeckTitleTop: 3,
      flydeckTitleLeft: -4,
      symbolFontSize: 30,
      symbolTop: -2,
      symbolLeft: 3,
      subtitleFontSize: 12,
      subtitleTop: 1,
      subtitleLeft: -1,
    });

    expect(isValidElement(title)).toBe(true);
    expect(title.props.style).toMatchObject({
      "--app-title-font-size": "24px",
      "--app-title-top": "-1px",
      "--app-title-left": "2px",
      "--app-title-text-top": "3px",
      "--app-title-text-left": "-4px",
      "--app-title-symbol-font-size": "30px",
      "--app-title-symbol-top": "-2px",
      "--app-title-symbol-left": "3px",
      "--app-title-subtitle-font-size": "12px",
      "--app-title-subtitle-top": "1px",
      "--app-title-subtitle-left": "-1px",
    });
  });

  it("keeps identity content before separately placed title actions", () => {
    const markup = renderToStaticMarkup(
      <AppTitle
        title="Flydeck"
        subtitle="Workspace Console"
        action={<button type="button">?</button>}
      />,
    );

    expect(markup.indexOf("Flydeck")).toBeLessThan(
      markup.indexOf("Workspace Console"),
    );
    expect(markup.indexOf("Workspace Console")).toBeLessThan(
      markup.indexOf(">?</button>"),
    );
  });
});
