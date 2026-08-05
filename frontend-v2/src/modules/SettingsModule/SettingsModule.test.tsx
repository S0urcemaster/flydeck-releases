import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SettingsModule } from "./SettingsModule";

describe("SettingsModule", () => {
  it("composes the shared Module surface", () => {
    expect(renderToStaticMarkup(<SettingsModule padding="SPACE_SM" />)).toContain(
      'aria-label="Settings module"',
    );
  });
});
