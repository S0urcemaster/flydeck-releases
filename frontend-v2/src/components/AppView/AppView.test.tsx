import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppSettings, AppView } from "./AppView";

describe("AppView", () => {
  it("provides the unbounded function result base", () => {
    const markup = renderToStaticMarkup(
      <AppView>Result</AppView>,
    );

    expect(markup).toContain('data-component-name="AppView"');
    expect(markup).not.toContain("data-app-height");
    expect(markup).toContain('data-access-mode="read"');
    expect(markup).toContain("Result");
  });

  it("marks apps that can write data", () => {
    const markup = renderToStaticMarkup(
      <AppView accessMode="read-write">Result</AppView>,
    );

    expect(markup).toContain('data-access-mode="read-write"');
  });

  it("renders persisted app settings independently from the app view", () => {
    const markup = renderToStaticMarkup(
      <AppSettings
        componentName="CompassApp"
        defaultDataSource="_system/compass"
      />,
    );

    expect(markup).toContain('data-component-name="ConfigEditor"');
    expect(markup).toContain('value="_system/compass"');
  });
});
