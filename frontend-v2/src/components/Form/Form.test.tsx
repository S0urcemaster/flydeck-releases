import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "../Input";
import { FormRow } from "../FormRow";
import { Form } from "./Form";

describe("Form", () => {
  it("gives every FormRow action the same configured width", () => {
    const markup = renderToStaticMarkup(
      <Form actionWidth="123px" padding="7px">
        <FormRow label="Name" onSet={() => undefined}>
          <Input aria-label="Name" />
        </FormRow>
        <FormRow label="Description" onSet={() => undefined}>
          <Input aria-label="Description" />
        </FormRow>
      </Form>,
    );

    expect(markup).toContain('data-component-name="Form"');
    expect(markup.match(/width:123px/g)).toHaveLength(2);
    expect(markup).toContain("padding:7px");
  });
});
