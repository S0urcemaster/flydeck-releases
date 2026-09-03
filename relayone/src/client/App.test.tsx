import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RelayPostSummary } from "../shared/contracts";
import { normalizeRelaySite, PostNavigation } from "./App";
import { FullscreenImage } from "./FullscreenImage";

const root: RelayPostSummary = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "Posts",
  localId: "posts",
  createdAt: "2026-08-28T08:00:00.000Z",
  updatedAt: "2026-08-28T08:00:00.000Z",
  imageUrl: null,
  childCount: 0,
  hasChildren: false,
};

describe("Relay One client response", () => {
  it("keeps an empty current publication list visible", () => {
    expect(normalizeRelaySite({
      title: "Relay One",
      info: "Info",
      roots: [],
    }).roots).toEqual([]);
  });

  it("keeps root metadata without requiring recursive content", () => {
    expect(normalizeRelaySite({
      title: "Relay One",
      info: "Info",
      roots: [root],
    }).roots[0]).toEqual(root);
  });

  it("renders images as accessible fullscreen triggers", () => {
    const markup = renderToStaticMarkup(
      <FullscreenImage
        alt="Public post"
        buttonClassName="heroImageButton"
        src="/api/images/post"
      />,
    );

    expect(markup).toContain('aria-label="Open image: Public post"');
    expect(markup).toContain('src="/api/images/post"');
    expect(markup).not.toContain('role="dialog"');
  });

  it("shows the recursive descendant count instead of an arrow for parents", () => {
    const markup = renderToStaticMarkup(
      <PostNavigation
        levels={[{
          activeId: root.id,
          depth: 0,
          nodes: [{ ...root, childCount: 12, hasChildren: true }],
        }]}
        selectedId={root.id}
      />,
    );

    expect(markup).toContain('aria-label="12 children"');
    expect(markup).toContain(">12</span>");
    expect(markup).not.toContain("›");
  });
});
