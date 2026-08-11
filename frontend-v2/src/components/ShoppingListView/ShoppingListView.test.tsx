import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShoppingListView } from "./ShoppingListView";

describe("ShoppingListView", () => {
  it("composes AppView and groups items by supermarket category", () => {
    const markup = renderToStaticMarkup(
      <ShoppingListView categories={[{
        id: "bakery",
        label: "Backwaren",
        items: [{ id: "bread", label: "Brot" }],
      }]} />,
    );

    expect(markup).toContain('data-component-name="ShoppingListView"');
    expect(markup).toContain("SHOPPING LIST");
    expect(markup).toContain("Backwaren");
    expect(markup).toContain("Brot");
  });
});
