import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ParentInput } from "./ParentInput";

describe("ParentInput", () => {
  it("composes the shared parent path input and action", () => {
    const root = { id: null, label: "", path: "", eligible: true } as const;
    const markup = renderToStaticMarkup(
      <ParentInput
        current={root}
        targets={[root]}
        value=""
        onChange={() => undefined}
        onSetParent={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="ParentInput"');
    expect(markup).toContain('aria-label="Parent node"');
    expect(markup).toContain('aria-label="Set Parent"');
  });
});
