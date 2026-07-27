import { describe, expect, it } from "vitest";

import { renderAppTitleJsx } from "./LabApp";

describe("AppTitle lab", () => {
  it("renders copyable JSX without writing files", () => {
    expect(renderAppTitleJsx("Flydeck", "V2")).toBe(
      '<AppTitle title="Flydeck" subtitle="V2" />',
    );
    expect(renderAppTitleJsx("Flydeck", "")).toBe('<AppTitle title="Flydeck" />');
  });
});
