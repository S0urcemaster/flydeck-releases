import { describe, expect, it } from "vitest";
import { getCommandHintLines } from "./commandHints";

describe("getCommandHintLines", () => {
  it("shows the command list while a command is incomplete", () => {
    expect(getCommandHintLines("/back")).toContain("/backup");
  });

  it("shows a short explanation for a complete command", () => {
    expect(getCommandHintLines("/backup")).toEqual([
      "/BACKUP",
      "Copies user and Flydon data to ~/.flydon-backup.",
    ]);
  });
});
