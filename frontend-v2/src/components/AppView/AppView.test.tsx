import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppView } from "./AppView";

describe("AppView", () => {
  it("provides the bounded function result base", () => {
    const markup = renderToStaticMarkup(
      <AppView title="OUTPUT">Result</AppView>,
    );

    expect(markup).toContain('data-component-name="AppView"');
    expect(markup).toContain('data-app-height="S"');
    expect(markup).toContain('data-access-mode="read"');
    expect(markup).toContain("OUTPUT");
    expect(markup).toContain("Result");
    expect(markup).toContain('aria-label="Configure OUTPUT"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it("marks apps that can write data", () => {
    const markup = renderToStaticMarkup(
      <AppView accessMode="read-write" title="EDITOR">Result</AppView>,
    );

    expect(markup).toContain('data-access-mode="read-write"');
  });
});
