import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RelayPostSummary } from "../shared/contracts";
import {
  ItemDateRange,
  ItemCreatedDate,
  formatDate,
  normalizeRelaySite,
  postHref,
  PostNavigation,
  readPath,
} from "./App";
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
  it("links the public apps without the obsolete Local navigation label", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) => readFile(
      new URL("./App.tsx", import.meta.url),
      "utf8",
    ));

    expect(source).toContain("https://relay-two.relay-one.de/flydeck/");
    expect(source.indexOf("https://relay-two.relay-one.de/flydeck/"))
      .toBeLessThan(source.indexOf("https://apps.relay-one.de/textor"));
    expect(source).toContain("https://apps.relay-one.de/textor");
    expect(source).toContain("https://apps.relay-one.de/webdictate");
    expect(source.indexOf("https://apps.relay-one.de/webdictate"))
      .toBeLessThan(source.indexOf("https://apps.relay-one.de/textor"));
    expect(source).not.toContain(">Local</a>");
  });

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

  it("keeps sport preview images for cards while the open post uses its player", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) => readFile(
      new URL("./App.tsx", import.meta.url),
      "utf8",
    ));

    expect(source).toContain("post.imageUrl && !isSportExerciseContent(post.content)");
    expect(source).toContain("entry.imageUrl && <img");
    expect(source).toContain("child.imageUrl && (");
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
    expect(markup).toContain("data-relay-navigation");
    expect(markup).not.toContain("›");
  });

  it("uses readable current tree paths without a hash or UUID", () => {
    expect(postHref(["posts", "september", "06"])).toBe("/posts/september/06");
    expect(readPath("/posts/september/06")).toEqual(["posts", "september", "06"]);
  });

  it("keeps the root path available for the latest-post landing page", () => {
    expect(readPath("/")).toEqual([]);
    expect(postHref([])).toBe("/");
  });

  it("renders each item date from creation through its last change", () => {
    const markup = renderToStaticMarkup(
      <ItemDateRange
        createdAt="2026-08-28T08:00:00.000Z"
        updatedAt="2026-09-06T10:30:00.000Z"
      />,
    );

    expect(markup).toContain('dateTime="2026-08-28T08:00:00.000Z"');
    expect(markup).toContain('dateTime="2026-09-06T10:30:00.000Z"');
    expect(markup).toContain(" – ");
  });

  it("renders only the creation date on latest-post cards", () => {
    const markup = renderToStaticMarkup(
      <ItemCreatedDate createdAt="2026-09-18T10:30:00.000Z" />,
    );

    expect(markup).toContain('dateTime="2026-09-18T10:30:00.000Z"');
    expect(markup).not.toContain(" – ");
  });

  it("formats dates in the fixed English Relay One order", () => {
    expect(formatDate("2026-09-19T14:16:00")).toBe("026 Sep 19 Sat, 2:16 PM");
  });
});
