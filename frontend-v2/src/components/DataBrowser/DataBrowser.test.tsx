import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createFlatTreeLocalIdPath,
  contentHasChanges,
  DataBrowser,
  moveSavedViewItem,
  orderSharedNodes,
  parseSavedViewPaths,
  removeSavedViewItem,
} from "./DataBrowser";

describe("DataBrowser", () => {
  it("uses the neutral Data root without demo entries", () => {
    const markup = renderToStaticMarkup(<DataBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="DataBrowser"');
    expect(markup).toContain("Data");
    expect(markup).not.toContain("Documents");
  });

  it("stores view references as unique newline-separated paths", () => {
    expect(parseSavedViewPaths(
      "projects/active\n_system/archive\nprojects/active\n\n",
    )).toEqual(["projects/active", "_system/archive"]);
  });

  it("derives stable saved-view paths from DATA local IDs", () => {
    const capabilities = {
      contentEditable: true,
      listEditable: true,
      listItemLimit: null,
    };
    expect(createFlatTreeLocalIdPath([
      {
        id: "00000000-0000-4000-8000-000000000001",
        parentId: null,
        kind: "data-file",
        label: "Posts",
        localId: "posts",
        position: 0,
        revision: 0,
        capabilities,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        parentId: "00000000-0000-4000-8000-000000000001",
        kind: "data-file",
        label: "News",
        localId: "news",
        position: 0,
        revision: 0,
        capabilities,
      },
    ], "00000000-0000-4000-8000-000000000002")).toBe("posts/news");
  });

  it("enables content save only for a changed draft", () => {
    expect(contentHasChanges("Saved content", "Saved content")).toBe(false);
    expect(contentHasChanges("Saved content", "Changed content")).toBe(true);
  });

  it("moves saved-view items after the requested sibling", () => {
    const items = ["one", "two", "three"].map((id) => ({
      id,
      label: id,
      path: id,
    }));
    expect(moveSavedViewItem(items, "three", "one").map(({ id }) => id))
      .toEqual(["one", "three", "two"]);
    expect(moveSavedViewItem(items, "three", null).map(({ id }) => id))
      .toEqual(["three", "one", "two"]);
  });

  it("removes only the requested saved-view reference", () => {
    const items = ["one", "two", "three"].map((id) => ({
      id,
      label: id,
      path: id,
    }));

    expect(removeSavedViewItem(items, "two").map(({ id }) => id))
      .toEqual(["one", "three"]);
    expect(removeSavedViewItem(items, "missing")).toEqual(items);
  });

  it("orders shared roots by stored ids and appends new shares", () => {
    const capabilities = {
      contentEditable: true,
      listEditable: true,
      listItemLimit: null,
    };
    const nodes = ["one", "two", "three"].map((localId, position) => ({
      id: `00000000-0000-4000-8000-00000000000${position + 1}`,
      parentId: null,
      kind: "data-file" as const,
      label: localId,
      localId,
      position,
      revision: 0,
      capabilities,
      shared: true,
      shareName: localId,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
    }));
    expect(orderSharedNodes(nodes, [nodes[1].id, nodes[0].id])
      .map(({ localId }) => localId)).toEqual(["two", "one", "three"]);
  });
});
