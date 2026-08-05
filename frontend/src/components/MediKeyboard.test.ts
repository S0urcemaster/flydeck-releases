import { describe, expect, it } from "vitest";
import { getMediKeyCharacters, mediLetterKeys } from "./MediKeyboard";

describe("MediKeyboard layout", () => {
  it("uses fourteen letter keys and includes the configured letters", () => {
    expect(mediLetterKeys).toHaveLength(14);
    const characters = mediLetterKeys.join("");
    for (const character of Array.from("abcdefghijklmnopqrstuvwxyzäöü")) {
      expect(characters).toContain(character);
    }
  });

  it("pairs A through M with O through Ä, adds digits to A through J, and pairs N with Ö and Ü", () => {
    expect(mediLetterKeys.map((characters) => Array.from(characters)[0]).join("")).toBe("abcdefghijklmn");
    expect(mediLetterKeys).toEqual([
      "ao1", "bp2", "cq3", "dr4", "es5", "ft6", "gu7",
      "hv8", "iw9", "jx0", "ky", "lz", "mä", "nöü",
    ]);
  });

  it("uses the German number-row symbols while shifted", () => {
    expect(getMediKeyCharacters("ao1", true)).toEqual(["A", "O", "!"]);
    expect(getMediKeyCharacters("bp2", true)).toEqual(["B", "P", "\""]);
    expect(getMediKeyCharacters("cq3", true)).toEqual(["C", "Q", "§"]);
    expect(getMediKeyCharacters("jx0", true)).toEqual(["J", "X", "="]);
  });
});
