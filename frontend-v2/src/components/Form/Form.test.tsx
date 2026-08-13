import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "../Input";
import { FormRow } from "../FormRow";
import { Form } from "./Form";

describe("Form", () => {
  it("lets idle FormRow inputs use the complete form width", () => {
    const markup = renderToStaticMarkup(
      <Form padding="7px">
        <FormRow label="Name" onSet={() => undefined}>
          <Input aria-label="Name" />
        </FormRow>
        <FormRow label="Description" onSet={() => undefined}>
          <Input aria-label="Description" />
        </FormRow>
      </Form>,
    );

    expect(markup).toContain('data-component-name="Form"');
    expect(markup).not.toContain("<button");
    expect(markup).toContain("padding:7px");
  });
});
