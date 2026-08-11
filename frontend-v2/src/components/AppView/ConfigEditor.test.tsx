import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfigEditor } from "./ConfigEditor";

describe("ConfigEditor", () => {
  it("provides a data source action for the configuration", () => {
    const markup = renderToStaticMarkup(
      <ConfigEditor dataSource="_system/Compass" />,
    );

    expect(markup).toContain('value="_system/Compass"');
    expect(markup).toContain('aria-label="Set Datasource"');
    expect(markup).toContain(">Set Datasource</button>");
    expect(markup).toContain("App Height");
    expect(markup).toContain('aria-label="App Height S"');
    expect(markup).toContain("S <small>M L</small>");
  });

  it("shows the datasource branch result below the input row", () => {
    const validMarkup = renderToStaticMarkup(
      <ConfigEditor dataSource="_system/Compass" dataSourceStatus="valid" />,
    );
    const invalidMarkup = renderToStaticMarkup(
      <ConfigEditor dataSource="_system/Missing" dataSourceStatus="invalid" />,
    );

    expect(validMarkup).toContain("Datasource branch found.");
    expect(validMarkup).toContain('class="_success_');
    expect(invalidMarkup).toContain("Datasource branch not found.");
    expect(invalidMarkup).toContain('class="_error_');
  });

  it("forwards the configured component-family controls", () => {
    const markup = renderToStaticMarkup(
      <ConfigEditor
        dataSource="_system/Compass"
        dataSourceButtonProps={{ width: "91px" }}
        dataSourceBaseProps={{ padding: "17px" }}
        dataSourceInputProps={{ width: "92px" }}
        cycleButtonProps={{ width: "93px" }}
      />,
    );

    expect(markup).toContain("width:91px");
    expect(markup).toContain("padding:17px");
    expect(markup).toContain("width:92px");
    expect(markup).toContain("width:93px");
  });
});
