import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders a clickable parent path through CompactButton", () => {
    const markup = renderToStaticMarkup(
      <Breadcrumb
        buttonProps={{ border: "BORDER_STANDARD", height: "27px" }}
        currentId="leaf"
        items={[
          { hasChildren: true, id: "root", label: "Root" },
          { hasChildren: true, id: "parent", label: "Parent" },
          { hasChildren: false, id: "leaf", label: "Leaf" },
        ]}
        onSelect={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="Breadcrumb"');
    expect(markup.match(/data-component-name="CompactButton"/g)).toHaveLength(3);
    expect(markup).toContain('aria-current="page"');
    expect(markup.match(/height:27px/g)).toHaveLength(3);
    expect(markup.match(/border:2px solid var\(--color-border\)/g)).toHaveLength(2);
    expect(markup.match(/border:var\(--border-standard\)/g)).toHaveLength(1);
  });

  it("renders a dashed root item when the parent path is empty", () => {
    const markup = renderToStaticMarkup(
      <Breadcrumb
        currentId=""
        items={[]}
        onSelect={() => undefined}
      />,
    );

    expect(markup).toContain(">root</button>");
    expect(markup).toContain('aria-label="root"');
    expect(markup).toContain("border:1px dashed var(--color-border)");
    expect(markup).toContain("disabled");
  });
});
