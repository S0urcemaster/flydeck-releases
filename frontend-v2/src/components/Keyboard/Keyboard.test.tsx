import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  expandedWordRange,
  commaDialCharacters,
  formatDate,
  formatTime,
  cycleKeyboardShift,
  emojiKeyboardCharacter,
  emojiKeyboardLayouts,
  Keyboard,
  initialKeyboardFontStage,
  keyboardCharacter,
  keyboardLetterDialOptions,
  keyboardKeys,
  lockKeyboardShift,
  mergeSpeechSegments,
  nextEmojiKeyboardLayout,
  nextKeyboardLayout,
  periodDialCharacters,
  previousGrapheme,
  releaseKeyboardShiftAfterCharacter,
  scaledFontSize,
  symbolCycleCharacters,
  wordRangeAtCursor,
} from "./Keyboard";

describe("Keyboard", () => {
  it("starts its font-size selector at M", () => {
    expect(initialKeyboardFontStage).toBe("medium");
  });

  it("renders the three short and long press actions", () => {
    const markup = renderToStaticMarkup(
      <Keyboard
        fontStage="medium"
        onFontStageChange={() => undefined}
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain('aria-label="Show smartphone keyboard"');
    expect(markup).toContain('aria-label="Close keyboard"');
    expect(markup.match(/background:var\(--color-speech\)/g)).toHaveLength(2);
    expect(markup).toContain(">L S</small>");
    expect(markup).toContain(">CP</small>");
    expect(markup).toContain(">PS</small>");
    expect(markup).toContain(">AL</small>");
    expect(markup).toContain('aria-label="Keyboard keys"');
    expect(keyboardKeys).toHaveLength(31);
    expect(markup.match(/data-key-id=/g)).toHaveLength(33);
    expect(markup).toContain('data-key-id="01"');
    expect(markup).toContain('data-key-id="31"');
    expect(markup.match(/data-key-id="30"/g)).toHaveLength(3);
    expect(markup).toContain('data-key-segment="1"');
    expect(markup).toContain('data-key-segment="2"');
    expect(markup).toContain('data-key-segment="3"');
    expect(markup).toContain('aria-label="Backspace"');
    expect(markup).toContain('data-component-name="BackspaceButton"');
    expect(markup.match(/data-position="row-two-edge"/g)).toHaveLength(2);
    expect(markup).toContain('data-component-name="ShiftButton"');
    expect(markup).toContain(">😀</span>");
    expect(markup.match(/lucide-space/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Comma, double quote, or single quote"');
    expect(markup).toContain('aria-label="Space"');
    expect(markup).toContain('aria-label="Period, hyphen, colon, or slash"');
    expect(markup).toContain('aria-label="Enter"');
    expect(markup).toContain('aria-label="Start dictation"');
    expect(markup).toContain('background:var(--color-speech)');
    expect(markup).not.toContain("MIC</button>");
    expect(markup).toContain(">↵</button>");
    expect(markup).toContain(">ä</small>");
    expect(markup).toContain(">ö</small>");
    expect(markup).toContain(">ü</small>");
    expect(markup).toContain(">&quot; &#x27;</small>");
    expect(markup).toContain(">- : /</small>");
    expect(markup).toContain("gap:3px");
  });

  it("can occupy the complete second row of a Block", () => {
    const markup = renderToStaticMarkup(
      <Keyboard
        fontStage="medium"
        layout="block"
        onFontStageChange={() => undefined}
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup).toContain('data-layout="block"');
    expect(markup).toContain("width:100%");
  });

  it("applies one owned height to all toolbar and key buttons", () => {
    const markup = renderToStaticMarkup(
      <Keyboard
        buttonHeight="34px"
        fontStage="medium"
        onFontStageChange={() => undefined}
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup.match(/height:34px/g)).toHaveLength(40);
  });

  it("shows when the smartphone keyboard toggle is active", () => {
    const markup = renderToStaticMarkup(
      <Keyboard
        fontStage="medium"
        onFontStageChange={() => undefined}
        smartphoneKeyboardEnabled
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup).toContain('aria-label="Hide smartphone keyboard"');
    expect(markup).toContain('aria-pressed="true"');
  });

  it("renders supplied form actions in a row below its keys", () => {
    const markup = renderToStaticMarkup(
      <Keyboard
        actions={(
          <>
            <button aria-label="Create value">NEW</button>
            <button aria-label="Save value">SAVE</button>
          </>
        )}
        fontStage="medium"
        onFontStageChange={() => undefined}
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup).toContain('aria-label="Create value"');
    expect(markup).toContain('aria-label="Save value"');
    expect(markup.indexOf('aria-label="Start dictation"'))
      .toBeLessThan(markup.indexOf('aria-label="Create value"'));
  });

  it("deduplicates cumulative speech recognition results", () => {
    expect(mergeSpeechSegments(["Das ist gut", "Das ist gut."]))
      .toBe("Das ist gut.");
    expect(mergeSpeechSegments([
      "Heute ist es schön",
      "Heute ist das Wetter schön.",
    ])).toBe("Heute ist das Wetter schön.");
    expect(mergeSpeechSegments(["Heute ist Montag.", "Morgen ist Dienstag."]))
      .toBe("Heute ist Montag. Morgen ist Dienstag.");
  });

  it("expands a word selection repeatedly toward the next word", () => {
    expect(expandedWordRange("one two three", 0, 3)).toEqual({ start: 0, end: 7 });
    expect(expandedWordRange("one two three", 0, 7)).toEqual({ start: 0, end: 13 });
    expect(expandedWordRange("one two", 4, 7)).toEqual({ start: 0, end: 7 });
  });

  it("always renders the shared date and time button", () => {
    const markup = renderToStaticMarkup(
      <Keyboard
        fontStage="small"
        onFontStageChange={() => undefined}
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup).toContain(">D</small>");
  });

  it("formats local time and a three-digit year without the millennium", () => {
    const date = new Date(2026, 7, 8, 9, 5);
    expect(formatTime(date)).toBe("09:05");
    expect(formatDate(date)).toBe("08.08.026");
  });

  it("cycles three font stages relative to each configured default", () => {
    expect(scaledFontSize("0.82rem", "small", "small")).toBe("0.82rem");
    expect(scaledFontSize("24px", "medium", "medium")).toBe("24px");
    expect(scaledFontSize("24px", "large", "medium"))
      .toBe("calc(24px * 1.25)");
  });

  it("finds the Unicode word at and immediately before the cursor", () => {
    expect(wordRangeAtCursor("one bäume three", 6)).toEqual({ start: 4, end: 9 });
    expect(wordRangeAtCursor("one bäume three", 9)).toEqual({ start: 4, end: 9 });
    expect(wordRangeAtCursor("one bäume three", 3)).toEqual({ start: 0, end: 3 });
  });

  it("maps QWERTZ letters and symbols across all 26 character keys", () => {
    expect(keyboardCharacter("01", "lower")).toBe("q");
    expect(keyboardCharacter("06", "lower")).toBe("z");
    expect(keyboardCharacter("21", "upper")).toBe("Y");
    expect(keyboardCharacter("27", "lower")).toBe("m");
    expect(keyboardCharacter("01", "symbols")).toBe("1");
    expect(keyboardCharacter("10", "symbols")).toBe("0");
    expect(keyboardCharacter("15", "symbols")).toBe("§");
    expect(keyboardCharacter("21", "symbols")).toBe("_");
    expect(keyboardCharacter("22", "symbols")).toBe("€");
    expect(keyboardCharacter("23", "symbols")).toBe("23");
    expect(keyboardCharacter("26", "symbols")).toBe("26");
    expect(keyboardCharacter("27", "symbols")).toBe(";");
    expect(keyboardCharacter("20", "lower")).toBeNull();
  });

  it("defines the punctuation multi-tap order", () => {
    expect(commaDialCharacters).toEqual([",", '"', "'"]);
    expect(periodDialCharacters).toEqual([".", "-", ":", "/"]);
  });

  it("fills symbol keys 23 through 26 with three-value CycleButtons", () => {
    expect(symbolCycleCharacters).toEqual({
      "23": ["!", "?", "%"],
      "24": ["[", "]", "\\"],
      "25": ["{", "}", "|"],
      "26": ["^", "~", "`"],
    });
  });

  it("maps umlaut DialButtons in lower and uppercase layouts", () => {
    expect(keyboardLetterDialOptions("11", "lower")).toEqual(["a", "ä"]);
    expect(keyboardLetterDialOptions("09", "upper")).toEqual(["O", "Ö"]);
    expect(keyboardLetterDialOptions("07", "upper")).toEqual(["U", "Ü"]);
    expect(keyboardLetterDialOptions("11", "symbols")).toBeNull();
    expect(keyboardLetterDialOptions("12", "lower")).toBeNull();
  });

  it("cycles lowercase, uppercase, and symbol layouts", () => {
    expect(nextKeyboardLayout("lower")).toBe("upper");
    expect(nextKeyboardLayout("upper")).toBe("symbols");
    expect(nextKeyboardLayout("symbols")).toBe("lower");
  });

  it("maps three complete emoji layouts and cycles them", () => {
    expect(emojiKeyboardLayouts.every((layout) => layout.length === 26)).toBe(true);
    expect(emojiKeyboardCharacter("01", 0)).toBe("😀");
    expect(emojiKeyboardCharacter("01", 1)).toBe("🧐");
    expect(emojiKeyboardCharacter("01", 2)).toBe("👍");
    expect(emojiKeyboardCharacter("27", 2)).toBe("🫶");
    expect(emojiKeyboardCharacter("20", 0)).toBeNull();
    expect(nextEmojiKeyboardLayout(0)).toBe(1);
    expect(nextEmojiKeyboardLayout(1)).toBe(2);
    expect(nextEmojiKeyboardLayout(2)).toBe(0);
  });

  it("releases uppercase but retains symbols and a long-press lock", () => {
    const uppercase = cycleKeyboardShift({ locked: false, mode: "lower" });
    expect(uppercase).toEqual({ locked: false, mode: "upper" });
    expect(releaseKeyboardShiftAfterCharacter(uppercase)).toEqual({
      locked: false,
      mode: "lower",
    });
    const symbols = cycleKeyboardShift(uppercase);
    expect(symbols).toEqual({ locked: false, mode: "symbols" });
    expect(releaseKeyboardShiftAfterCharacter(symbols)).toBe(symbols);
    expect(cycleKeyboardShift(symbols)).toEqual({ locked: false, mode: "lower" });

    const locked = lockKeyboardShift({ locked: false, mode: "lower" });
    expect(locked).toEqual({ locked: true, mode: "upper" });
    expect(releaseKeyboardShiftAfterCharacter(locked)).toBe(locked);
    expect(cycleKeyboardShift(locked)).toEqual({ locked: false, mode: "lower" });
  });

  it("treats emoji variants as one Backspace grapheme", () => {
    expect(previousGrapheme("a✌️", "a✌️".length)).toBe("✌️");
    expect(previousGrapheme("😀", "😀".length)).toBe("😀");
  });
});
