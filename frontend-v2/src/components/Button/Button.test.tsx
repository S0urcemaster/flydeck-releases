import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button, ButtonConfigurationProvider } from "./Button";

describe("Button", () => {
  it("renders the explicit persisted visual contract", () => {
    const markup = renderToStaticMarkup(
      <Button
        color="COLOR_TEXT"
        background="COLOR_SURFACE"
        border="BORDER_STANDARD"
      >
        Default
      </Button>,
    );

    expect(markup).toContain("color:var(--color-text)");
    expect(markup).toContain("background:var(--color-surface)");
    expect(markup).toContain("border:var(--border-standard)");
  });

  it("exposes selected state through its public contract", () => {
    const markup = renderToStaticMarkup(
      <Button selected size="compact">Select</Button>,
    );

    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-size="compact"');
    expect(markup).toContain("color:var(--color-surface)");
  });

  it("allows a composed button to confirm by forcing inactive appearance", () => {
    const markup = renderToStaticMarkup(
      <Button
        background="COLOR_SURFACE"
        pressed={false}
        selected
      >
        Confirmed
      </Button>,
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("background:var(--color-surface)");
  });

  it("inherits active color from its composition root", () => {
    const markup = renderToStaticMarkup(
      <ButtonConfigurationProvider activeColor="COLOR_ACCENT_TWO">
        <Button selected>Inherited</Button>
      </ButtonConfigurationProvider>,
    );

    expect(markup).toContain("background:var(--color-accent-two)");
  });

  it("forwards an explicit Base height", () => {
    const markup = renderToStaticMarkup(
      <Button height="32px">Sized button</Button>,
    );

    expect(markup).toContain("height:32px");
  });

  it("provides its font size to composed buttons", () => {
    const markup = renderToStaticMarkup(
      <ButtonConfigurationProvider fontSize="15px">
        <Button>Inherited size</Button>
      </ButtonConfigurationProvider>,
    );

    expect(markup).toContain("font-size:15px");
  });

  it("provides its font weight to composed buttons", () => {
    const markup = renderToStaticMarkup(
      <ButtonConfigurationProvider fontWeight="500">
        <Button>Inherited weight</Button>
      </ButtonConfigurationProvider>,
    );

    expect(markup).toContain("font-weight:500");
  });

  it("keeps provider-owned controls at the configured height", () => {
    const markup = renderToStaticMarkup(
      <ButtonConfigurationProvider fontSize="12px" height="40px">
        <Button>Stable height</Button>
      </ButtonConfigurationProvider>,
    );

    expect(markup).toContain("font-size:12px");
    expect(markup).toContain("height:40px");
  });

  it("exposes the selected-state color as an explicit prop", () => {
    const markup = renderToStaticMarkup(
      <Button activeColor="COLOR_ACCENT_TWO" selected>Active</Button>,
    );

    expect(markup).toContain("background:var(--color-accent-two)");
  });
});
