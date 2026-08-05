import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemoryBrowser } from "./MemoryBrowser";
import { TreeBrowserModel } from "../TreeBrowser";

const model = new TreeBrowserModel({
  storageKey: "flydeck.test.memory-browser",
  initialTree: [],
});

describe("MemoryBrowser", () => {
  it("specializes TreeBrowser for memories", () => {
    const markup = renderToStaticMarkup(
      <MemoryBrowser model={model} />,
    );
    expect(markup).toContain('aria-label="Memory browser"');
    expect(markup).toContain('data-component-name="MemoryBrowser"');
  });
});
