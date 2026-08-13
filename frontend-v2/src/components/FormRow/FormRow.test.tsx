import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "../Input";
import { FormRow } from "./FormRow";

describe("FormRow", () => {
  it("uses the complete row width and renders no idle action", () => {
    const markup = renderToStaticMarkup(
      <FormRow label="Name" onSet={() => undefined} padding="8px">
        <Input aria-label="Inventory item name" label="Name" />
      </FormRow>,
    );

    expect(markup).toContain('data-component-name="FormRow"');
    expect(markup).toContain("width:100%");
    expect(markup).toContain(">Name</span>");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain(">Save</button>");
    expect(markup).not.toContain(">New</button>");
    expect(markup).toContain("padding:8px");
  });
});
