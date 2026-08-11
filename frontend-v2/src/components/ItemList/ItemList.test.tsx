import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ItemList } from "./ItemList";

describe("ItemList", () => {
  it("marks the selected item in a compact clickable list", () => {
    const markup = renderToStaticMarkup(
      <ItemList
        buttonProps={{ border: "BORDER_STANDARD" }}
        items={[
          { hasChildren: true, id: "one", label: "One" },
          { hasChildren: false, id: "two", label: "Two" },
        ]}
        selectedId="two"
        onSelect={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="ItemList"');
    expect(markup).toContain('aria-label="Select One"');
    expect(markup).toContain('aria-label="Select Two"');
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup.match(/border:2px solid var\(--color-border\)/g)).toHaveLength(1);
    expect(markup.match(/border:var\(--border-standard\)/g)).toHaveLength(1);
  });
});
