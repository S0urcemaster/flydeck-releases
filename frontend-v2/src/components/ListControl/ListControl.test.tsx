import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  canCreateListName,
  containsListName,
  ListControl,
  ListControlInput,
} from "./ListControl";

describe("ListControl", () => {
  it("renders the fixed actions in their visual order", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        itemCount={2}
        selectedName="Alpha"
        page={0}
        pageSize={7}
        childPageSize={7}
        onPageChange={() => undefined}
        onChildPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="ListControl"');
    expect(markup).toContain('aria-label="Create child in Alpha"');
    expect(markup).toContain('background:var(--color-surface)');
    expect(markup).toContain('padding:0');
    expect(markup).toContain('>Alpha</span>');
    expect(markup).toContain('aria-label="Previous page"');
    expect(markup).not.toContain("Arm delete for Alpha");
    expect(markup.indexOf("Move selected item down")).toBeLessThan(
      markup.indexOf("Previous page"),
    );
    expect(markup.indexOf("Previous page")).toBeLessThan(
      markup.indexOf("Next page"),
    );
    expect(markup).not.toContain("List size M");
  });

  it("opens a dedicated new-item input from the owner label", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        activeColor="COLOR_ACCENT_TWO"
        buttonProps={{ height: "40px" }}
        initialView="new"
        itemCount={1}
        itemNames={["Existing"]}
        selectedName="Alpha"
        onNew={() => undefined}
        page={0}
        pageSize={7}
        childPageSize={7}
        onPageChange={() => undefined}
        onChildPageSizeChange={() => undefined}
      />,
    );
    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain("autofocus");
    expect(markup).not.toContain('aria-label="Create child in Alpha"');
  });

  it("keeps new-item controls closed when creation is disabled", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        initialView="new"
        itemCount={1}
        selectedName="Beta"
        newDisabled
        onNew={() => undefined}
        page={0}
        pageSize={7}
        childPageSize={7}
        onPageChange={() => undefined}
        onChildPageSizeChange={() => undefined}
      />,
    );
    expect(markup).not.toContain("<input");
    expect(markup.match(
      /<button[^>]*aria-label="Create child in Beta"[^>]*>/,
    )?.[0]).toContain("disabled");
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
      <ListControlInput
        editable={false}
        itemCount={1}
        itemLimit={1}
        itemNames={["Fixed"]}
        onNew={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain("disabled");
  });

  it("keeps the selected item input and its keyboard actions separate", () => {
    const markup = renderToStaticMarkup(
      <ListControlInput
        activeColor="COLOR_ACCENT_ONE"
        checked
        editable
        itemCount={2}
        itemNames={["Alpha", "Beta"]}
        itemNumber={1}
        onCheckedChange={() => undefined}
        selectedName="Alpha"
        onNew={() => undefined}
        onRename={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Item name"');
    expect(markup).toContain('aria-label="Deselect Alpha for actions"');
    expect(markup.indexOf("Deselect Alpha for actions")).toBeLessThan(
      markup.indexOf('aria-label="Item name"'),
    );
    expect(markup).not.toContain(">Name</span>");
    expect(markup).toContain('value="Alpha"');
    expect(markup).not.toContain('data-component-name="ListControl"');
  });

  it("can delete an item from a locked list", () => {
    const markup = renderToStaticMarkup(
      <ListControlInput
        buttonProps={{ height: "40px" }}
        deleteEnabled
        editable={false}
        itemCount={1}
        itemNames={["Discarded"]}
        itemNumber={1}
        selectedName="Discarded"
        deleteLabel="Discarded"
        onDelete={() => undefined}
      />,
    );
    const deleteButton = markup.match(
      /<button[^>]*aria-label="Arm delete for Discarded"[^>]*>/,
    )?.[0];

    expect(deleteButton).toBeTruthy();
    expect(deleteButton).not.toContain("disabled");
    expect(markup).toContain('data-component-name="InputControl"');
    expect(markup).toContain("height:40px");
    expect(markup.indexOf('aria-label="Item name"')).toBeLessThan(
      markup.indexOf("Arm delete for Discarded"),
    );
  });

  it("allows creating the first item in an empty owner list", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        initialView="new"
        itemCount={0}
        selectedName="Empty"
        onNew={() => undefined}
        page={0}
        pageSize={7}
        childPageSize={7}
        onPageChange={() => undefined}
        onChildPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="New item name"');
    expect(markup).toContain("autofocus");
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
  });

  it("can delegate its page buttons to the list owner", () => {
    const markup = renderToStaticMarkup(
      <ListControl
        showPageButtons={false}
        itemCount={12}
        page={0}
        pageSize={7}
        childPageSize={7}
        onPageChange={() => undefined}
        onChildPageSizeChange={() => undefined}
      />,
    );

    expect(markup).not.toContain('aria-label="Previous page"');
    expect(markup).not.toContain('aria-label="Next page"');
  });
});
