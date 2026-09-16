import { describe, expect, it } from "vitest";

import {
  graphemeLength,
  setBlueskyTitleIncluded,
  splitBlueskyPosts,
  updateBlueskyPosts,
} from "./BlueskyApp";

describe("BlueskyApp transformer", () => {
  it("splits source text into posts no longer than 300 characters", () => {
    const posts = splitBlueskyPosts(`${"word ".repeat(70)}tail`);

    expect(posts.length).toBeGreaterThan(1);
    expect(posts.every((post) => post.length <= 300)).toBe(true);
    expect(posts.join(" ")).toContain("tail");
  });

  it("creates posts from overflow and removes a trailing empty post", () => {
    const overflowed = updateBlueskyPosts(["draft"], 0, "x".repeat(301));
    expect(overflowed).toEqual(["x".repeat(300), "x"]);

    expect(updateBlueskyPosts(["post", ""], 1, "")).toEqual(["post"]);
  });

  it("includes and removes the item title without exceeding the post limit", () => {
    const included = setBlueskyTitleIncluded(["Body"], "Item title", true);
    expect(included).toEqual(["Item title\n\nBody"]);
    expect(setBlueskyTitleIncluded(included, "Item title", false)).toEqual(["Body"]);

    const overflowed = setBlueskyTitleIncluded(["👨‍👩‍👧‍👧".repeat(300)], "Title", true);
    expect(overflowed).toHaveLength(2);
    expect(overflowed.every((post) => graphemeLength(post) <= 300)).toBe(true);
  });

  it("re-splits the complete thread when the title changes the first post capacity", () => {
    const body = `${"word ".repeat(59)}tail`;
    const included = setBlueskyTitleIncluded(splitBlueskyPosts(body), "A longer title", true);

    expect(included).toHaveLength(2);
    expect(included[0]).toMatch(/^A longer title\n\n/);
    expect(included.every((post) => graphemeLength(post) <= 300)).toBe(true);
    expect(included.join(" ")).toContain("tail");
  });
});
