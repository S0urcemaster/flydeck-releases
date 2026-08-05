import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CompassView } from "./CompassView";

describe("CompassView", () => {
  it("composes FunctionView and groups sayings by category", () => {
    const markup = renderToStaticMarkup(
      <CompassView categories={[{
        id: "mut",
        label: "Mut",
        sayings: [{ id: "one", text: "Ein Spruch" }],
      }]} />,
    );

    expect(markup).toContain('data-component-name="CompassView"');
    expect(markup).toContain("COMPASS");
    expect(markup).toContain("Mut");
    expect(markup).toContain("Ein Spruch");
  });
});
