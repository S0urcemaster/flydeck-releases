import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "../Input";
import { FormRow } from "./FormRow";

describe("FormRow", () => {
  it("uses only its value label while idle", () => {
    const markup = renderToStaticMarkup(
      <FormRow label="Name" onSet={() => undefined} padding="8px">
        <Input aria-label="Inventory item name" />
      </FormRow>,
    );

    expect(markup).toContain('data-component-name="FormRow"');
    expect(markup).toContain("width:100%");
    expect(markup).toContain('aria-label="Name"');
    expect(markup).toContain(">Name</button>");
    expect(markup.indexOf('aria-label="Inventory item name"')).toBeLessThan(
      markup.indexOf('aria-label="Name"'),
    );
    expect(markup).not.toContain(">Save</button>");
    expect(markup).not.toContain(">New</button>");
    expect(markup).toContain("padding:8px");
  });
});
