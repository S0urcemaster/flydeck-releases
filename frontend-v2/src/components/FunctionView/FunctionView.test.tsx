import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FunctionView } from "./FunctionView";

describe("FunctionView", () => {
  it("provides the bounded function result base", () => {
    const markup = renderToStaticMarkup(
      <FunctionView title="OUTPUT">Result</FunctionView>,
    );

    expect(markup).toContain('data-component-name="FunctionView"');
    expect(markup).toContain("OUTPUT");
    expect(markup).toContain("Result");
  });
});
