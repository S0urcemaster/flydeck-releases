import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CompassApp,
  moveCompassSaying,
  reconcileCompassOrder,
} from "./CompassApp";

describe("CompassApp", () => {
  it("renders selected sayings with priority controls", () => {
    const markup = renderToStaticMarkup(
      <CompassApp categories={[{
        id: "mut",
        label: "Mut",
        sayings: [{ id: "one", text: "Ein Spruch" }],
      }]} reorderButtonProps={{ width: "91px" }} />,
    );

    expect(markup).toContain('data-component-name="CompassApp"');
    expect(markup).toContain("COMPASS");
    expect(markup).toContain("Ein Spruch");
    expect(markup).toContain('aria-label="Position 1"');
    expect(markup).toContain('aria-label="Move Ein Spruch up"');
    expect(markup).toContain('aria-label="Move Ein Spruch down"');
    expect(markup.match(/width:91px/g)).toHaveLength(2);
  });

  it("reorders sayings only in Compass state", () => {
    expect(moveCompassSaying(["one", "two", "three"], "two", -1)).toEqual([
      "two",
      "one",
      "three",
    ]);
    expect(moveCompassSaying(["one", "two", "three"], "two", 1)).toEqual([
      "one",
      "three",
      "two",
    ]);
  });

  it("keeps priorities while selected sayings change", () => {
    expect(reconcileCompassOrder(["two", "one"], [
      { id: "one" },
      { id: "three" },
    ])).toEqual(["one", "three"]);
  });
});
