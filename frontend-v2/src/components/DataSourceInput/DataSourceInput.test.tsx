import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataSourceInput } from "./DataSourceInput";

const source = {
  id: "compass",
  label: "Compass",
  path: "_system/Compass",
  eligible: true,
};

describe("DataSourceInput", () => {
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
});
