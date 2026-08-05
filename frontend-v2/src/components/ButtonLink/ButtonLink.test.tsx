import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ButtonLink } from "./ButtonLink";

describe("ButtonLink", () => {
  it("returns a link-shaped control", () => {
    expect(isValidElement(ButtonLink({ href: "/lab", children: "LAB" }))).toBe(true);
  });

  it("supports a viewport-fixed lab placement", () => {
    const markup = renderToStaticMarkup(
      <ButtonLink href="/" placement="viewport-edge">APP</ButtonLink>,
    );

    expect(markup).toContain('data-placement="viewport-edge"');
    expect(markup).toContain('data-component-name="ButtonLink"');
  });
});
