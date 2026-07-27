import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { ButtonLink } from "./ButtonLink";

describe("ButtonLink", () => {
  it("returns a link-shaped control", () => {
    expect(isValidElement(ButtonLink({ href: "/lab", children: "LAB" }))).toBe(true);
  });
});
