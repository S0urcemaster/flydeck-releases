import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  canCreateListName,
  containsListName,
  ListControl,
} from "./ListControl";

describe("ListControl", () => {
  it("renders status, input, and navigation controls while unfocused", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        itemCount={2}
        itemNames={["Alpha", "Beta"]}
        selectedName="Alpha"
        page={0}
        pageSize={5}
        onNew={() => undefined}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="ListControl"');
    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain('value="Alpha"');
    expect(markup).not.toContain(">＋</button>");
    expect(markup).not.toContain(">✓</button>");
    expect(markup).toContain('aria-label="Previous page"');
    expect(markup.indexOf("Move selected item down")).toBeLessThan(
      markup.indexOf("Previous page"),
    );
    expect(markup.indexOf("Previous page")).toBeLessThan(
      markup.indexOf("Next page"),
    );
  });

  it("only accepts a non-empty, unique name", () => {
    expect(containsListName(["Alpha"], " alpha ")).toBe(true);
    expect(containsListName(["Alpha"], "Beta")).toBe(false);
    expect(canCreateListName(["Alpha"], "")).toBe(false);
    expect(canCreateListName(["Alpha"], " alpha ")).toBe(false);
    expect(canCreateListName(["Alpha"], "Beta")).toBe(true);
  });

  it("disables list editing when the list is locked", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        editable={false}
        itemCount={1}
        itemLimit={1}
        itemNames={["Fixed"]}
        page={0}
        pageSize={5}
        onNew={() => undefined}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain("disabled");
  });
});
