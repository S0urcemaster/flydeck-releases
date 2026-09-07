import { describe, expect, it } from "vitest";

import {
  createNumberedBlueskyThread,
  graphemeLength,
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

  it("reserves space for thread numbering and counts graphemes", () => {
    const posts = createNumberedBlueskyThread(["👨‍👩‍👧‍👧".repeat(300)]);

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatch(/ \(1\/2\)$/);
    expect(posts[1]).toMatch(/ \(2\/2\)$/);
    expect(posts.every((post) => graphemeLength(post) <= 300)).toBe(true);
  });
});
