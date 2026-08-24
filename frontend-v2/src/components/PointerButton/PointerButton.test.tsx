import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PointerButton } from "./PointerButton";

describe("PointerButton", () => {
  it("shows pointer content on the translucent accent owned by its mode", () => {
    const start = renderToStaticMarkup(
      <PointerButton mode="start" primary="Start" secondary="1m" />,
    );
    const browse = renderToStaticMarkup(
      <PointerButton
        deltaY="0.3125rem"
        mode="browse"
        padding="SPACE_MD"
        primary="Browse"
        primaryFontSize="1.5rem"
        secondary="10m"
        secondaryFontSize="0.75rem"
        width="16.5rem"
      />,
    );
    const end = renderToStaticMarkup(
      <PointerButton mode="end" primary="End" secondary="1h" />,
    );

    expect(start).toContain('data-pointer-mode="start"');
    expect(browse).toContain('data-pointer-mode="browse"');
    expect(end).toContain('data-pointer-mode="end"');
    expect(start).toContain('type="button"');
    expect(browse).toContain("--pointer-button-padding:var(--space-md)");
    expect(browse).toContain("--pointer-button-primary-font-size:1.5rem");
    expect(browse).toContain("--pointer-button-secondary-font-size:0.75rem");
    expect(browse).toContain("--pointer-button-delta-y:0.3125rem");
    expect(browse).toContain("width:16.5rem");
  });

  it("does not emit inline padding or background styles", () => {
    const markup = renderToStaticMarkup(
      <PointerButton mode="browse" primary="Browse" secondary="10m" />,
    );

    expect(markup).not.toContain("padding:");
    expect(markup).not.toContain("background:");
  });
});
