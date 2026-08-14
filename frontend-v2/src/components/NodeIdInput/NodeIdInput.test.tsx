import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NodeIdInput, normalizeNodeId } from "./NodeIdInput";

describe("NodeIdInput", () => {
  it("owns the shared ID input contract while retaining configured input styles", () => {
    const markup = renderToStaticMarkup(
      <NodeIdInput
        available={() => true}
        background="transparent"
        inputProps={{ background: "COLOR_SURFACE", fontSize: "19px" }}
        savedValue="alpha"
        value="beta"
        onChange={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="NodeIdInput"');
    expect(markup).toContain('aria-label="Item ID"');
    expect(markup).not.toContain('maxLength=');
    expect(markup).toContain('font-size:19px');
    expect(markup).toContain('background:var(--color-surface)');
  });

  it("normalizes IDs without owning feature state", () => {
    expect(normalizeNodeId("Shelf_A-2")).toBe("shelf_a-2");
  });
});
