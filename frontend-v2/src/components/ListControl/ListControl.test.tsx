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
        pageSize={6}
        onNew={() => undefined}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="ListControl"');
    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain(">Name</span>");
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
    expect(markup.indexOf("Next page")).toBeLessThan(
      markup.indexOf("List size M"),
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
        pageSize={6}
        onNew={() => undefined}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain("disabled");
  });

  it("can delegate its list-size button to the list owner", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        showListSizeButton={false}
        itemCount={0}
        itemNames={[]}
        page={0}
        pageSize={6}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-list-size-button="external"');
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
  });
});
