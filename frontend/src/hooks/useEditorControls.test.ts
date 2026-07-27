import { describe, expect, it } from "vitest";
import { mergeSpeechSegments } from "./useEditorControls";

describe("mergeSpeechSegments", () => {
  it("deduplicates cumulative speech results despite punctuation", () => {
    expect(mergeSpeechSegments(["Das ist gut", "Das ist gut."])).toBe("Das ist gut.");
  });

  it("uses a corrected cumulative result as the new complete version", () => {
    expect(mergeSpeechSegments([
      "Heute ist es schön",
      "Heute ist das Wetter schön.",
    ])).toBe("Heute ist das Wetter schön.");
  });

  it("preserves distinct consecutive speech segments", () => {
    expect(mergeSpeechSegments(["Heute ist Montag.", "Morgen ist Dienstag."]))
      .toBe("Heute ist Montag. Morgen ist Dienstag.");
  });
});
