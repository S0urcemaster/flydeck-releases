import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataSourceInput, dataSourceActionDisabled } from "./DataSourceInput";

const source = {
  id: "compass",
  label: "Compass",
  path: "_system/Compass",
  eligible: true,
};

describe("DataSourceInput", () => {
  it("enables Set Datasource only for a changed server-confirmed path", () => {
    expect(dataSourceActionDisabled("lagerraum", "tagebuch", true)).toBe(false);
    expect(dataSourceActionDisabled("lagerraum", "tagebuch", false)).toBe(true);
    expect(dataSourceActionDisabled("lagerraum", "lagerraum", true)).toBe(true);
    expect(dataSourceActionDisabled("", "tagebuch", true)).toBe(true);
  });

  it("renders a data source field", () => {
    const markup = renderToStaticMarkup(
      <DataSourceInput
        current={source}
        targets={[source]}
        value="_system/Compass"
        padding="14px"
        onChange={() => {}}
      />,
    );

    expect(markup).toContain('data-component-name="DataSourceInput"');
    expect(markup).toContain('aria-label="Root node"');
    expect(markup).toContain('value="_system/Compass"');
    expect(markup).toContain("padding:14px");
  });

  it("shows an unresolved draft as invalid without requiring a parent target", () => {
    const markup = renderToStaticMarkup(
      <DataSourceInput
        current={source}
        targets={[source]}
        valid={false}
        value="lagerraum"
        onChange={() => {}}
        onSetDataSource={() => {}}
      />,
    );

    expect(markup).toContain('value="lagerraum"');
    expect(markup).toContain("color:var(--color-error)");
  });

  it("shows the server-confirmed data source as valid", () => {
    const markup = renderToStaticMarkup(
      <DataSourceInput
        current={source}
        targets={[source]}
        valid
        value="_system/Compass"
        onChange={() => {}}
      />,
    );

    expect(markup).toContain("color:var(--color-success)");
  });
});
