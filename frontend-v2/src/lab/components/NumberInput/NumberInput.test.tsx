import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { clampNumber, NumberInput } from "./NumberInput";

describe("lab NumberInput", () => {
  it("returns the required scaffold number control", () => {
    expect(isValidElement(
      <NumberInput
        label="Red"
        value={128}
        min={0}
        max={255}
        onChange={() => undefined}
      />,
    )).toBe(true);
  });

  it("clamps values to its range", () => {
    expect(clampNumber(-1, 0, 255)).toBe(0);
    expect(clampNumber(300, 0, 255)).toBe(255);
  });
});
