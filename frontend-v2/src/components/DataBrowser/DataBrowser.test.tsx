import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  clipboardImage,
  contentHasChanges,
  DataBrowser,
  pastelItemColor,
  toInitialTree,
} from "./DataBrowser";

describe("DataBrowser", () => {
  it("accepts only an image file from a content textarea paste", () => {
    const image = new File(["image"], "clipboard.png", { type: "image/png" });
    const text = new File(["text"], "notes.txt", { type: "text/plain" });
    const item = (file: File) => ({
      kind: "file", type: file.type, getAsFile: () => file,
    });
    expect(clipboardImage([item(text), item(image)])).toBe(image);
    expect(clipboardImage([item(text)])).toBeNull();
  });

  it("uses the neutral Data root without demo entries", () => {
    const markup = renderToStaticMarkup(<DataBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="DataBrowser"');
    expect(markup).toContain("Data");
    expect(markup).not.toContain("Documents");
  });



  it("enables content save only for a changed draft", () => {
    expect(contentHasChanges("Saved content", "Saved content")).toBe(false);
    expect(contentHasChanges("Saved content", "Changed content")).toBe(true);
  });

  it("maps a stored hue to a light pastel and keeps null neutral", () => {
    expect(pastelItemColor(210)).toBe("hsl(210 65% 88%)");
    expect(pastelItemColor(null)).toBeUndefined();
  });

  it("gives the read-only trash directory a list-settings content mode", () => {
    const tree = toInitialTree({
      document: { nodes: [{
        id: "00000000-0000-4000-8000-000000000001",
        parentId: null,
        kind: "trash-directory",
        label: "_trash",
        localId: "_trash",
        position: 0,
        revision: 0,
        capabilities: { contentEditable: false, listEditable: false, listItemLimit: null },
      }] },
      semanticState: { enabledNodeIds: [] },
    } as never);

    expect(tree[0]).toMatchObject({
      kind: "trash-directory",
      contentEditable: true,
      listEditable: false,
    });
  });

});
