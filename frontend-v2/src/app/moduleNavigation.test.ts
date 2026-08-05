import { describe, expect, it } from "vitest";

import { toggleModuleAction } from "./moduleNavigation";

describe("toggleModuleAction", () => {
  it("opens an action module", () => {
    expect(toggleModuleAction("CRON", "HELP", "CRON")).toBe("HELP");
  });

  it("returns to the previous primary module when toggled again", () => {
    expect(toggleModuleAction("HELP", "HELP", "CRON")).toBe("CRON");
    expect(toggleModuleAction("CONFIG", "CONFIG", "DATA")).toBe("DATA");
  });

  it("switches directly between action modules", () => {
    expect(toggleModuleAction("HELP", "CONFIG", "FUNC")).toBe("CONFIG");
  });
});
