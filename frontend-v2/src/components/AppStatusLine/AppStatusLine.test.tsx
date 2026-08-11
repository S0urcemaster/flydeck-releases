import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppStatusLine } from "./AppStatusLine";

describe("AppStatusLine", () => {
  it("uses the shared success and error colors", () => {
    const successMarkup = renderToStaticMarkup(
      <AppStatusLine message="Server ready" />,
    );
    const errorMarkup = renderToStaticMarkup(
      <AppStatusLine error message="Server unavailable" />,
    );
    const offlineMarkup = renderToStaticMarkup(
      <AppStatusLine offline message="Offline" />,
    );

    expect(successMarkup).toContain('data-component-name="AppStatusLine"');
    expect(successMarkup).toContain("<output");
    expect(successMarkup).not.toContain("<button");
    expect(successMarkup).toContain('role="status"');
    expect(successMarkup).toContain("var(--color-success)");
    expect(errorMarkup).toContain("Server unavailable");
    expect(errorMarkup).toContain("var(--color-error)");
    expect(offlineMarkup).toContain("var(--color-accent-one)");
  });
});
