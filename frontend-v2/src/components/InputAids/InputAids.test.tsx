import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  expandedWordRange,
  formatDate,
  formatTime,
  InputAids,
  scaledFontSize,
  wordRangeAtCursor,
} from "./InputAids";

describe("InputAids", () => {
  it("renders the three short and long press actions", () => {
    const markup = renderToStaticMarkup(
      <InputAids
        fontStage="medium"
        onFontStageChange={() => undefined}
        targetRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(markup).toContain("←");
    expect(markup).toContain("M <small>L S</small>");
    expect(markup).toContain("<small>CP</small>");
    expect(markup).toContain("<small>PS</small>");
    expect(markup).toContain("<small>AL</small>");
  });

  it("expands a word selection repeatedly toward the next word", () => {
    expect(expandedWordRange("one two three", 0, 3)).toEqual({ start: 0, end: 7 });
    expect(expandedWordRange("one two three", 0, 7)).toEqual({ start: 0, end: 13 });
    expect(expandedWordRange("one two", 4, 7)).toEqual({ start: 0, end: 7 });
  });

  it("renders a date and time button only for textareas", () => {
    const markup = renderToStaticMarkup(
      <InputAids
        fontStage="small"
        onFontStageChange={() => undefined}
        showDateTimeButton
        targetRef={createRef<HTMLTextAreaElement>()}
      />,
    );

    expect(markup).toContain("T <small>D</small>");
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
});
