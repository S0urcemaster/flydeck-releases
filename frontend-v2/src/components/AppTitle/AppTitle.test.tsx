import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { AppTitle } from "./AppTitle";

describe("AppTitle", () => {
  it("returns a reusable title element", () => {
    const title = AppTitle({
      title: "Flydeck",
      subtitle: "Workspace Console · V2",
    });

    expect(isValidElement(title)).toBe(true);
  });
});
