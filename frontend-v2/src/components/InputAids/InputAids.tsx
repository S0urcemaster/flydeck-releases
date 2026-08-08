import type { RefObject } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { CycleButton, type CycleButtonProps } from "../CycleButton";
import { LongPressButton, type LongPressButtonProps } from "../LongPressButton";
import styles from "./InputAids.module.css";

export type TextEntryElement = HTMLInputElement | HTMLTextAreaElement;
export type InputFontStage = "small" | "medium" | "large";

export type InputAidsProps = {
  buttonProps?: Omit<
    LongPressButtonProps,
    "aria-label" | "children" | "onLongPress" | "onPress"
  >;
  cycleButtonProps?: Omit<
    CycleButtonProps,
    "onChange" | "options" | "value"
  >;
  fontStage: InputFontStage;
  onFontStageChange: (stage: InputFontStage) => void;
  showDateTimeButton?: boolean;
  targetRef: RefObject<TextEntryElement | null>;
} & BaseStyleProps;

export function InputAids({
  buttonProps,
  cycleButtonProps,
  fontStage,
  onFontStageChange,
  showDateTimeButton = false,
  targetRef,
  color = "COLOR_TEXT",
  background = "transparent",
  border = "0",
  padding = "0",
  ...baseProps
}: InputAidsProps) {
  return (
    <Base
      {...baseProps}
      className={styles.root}
      data-has-date-time-button={showDateTimeButton || undefined}
      componentName="InputAids"
      color={color}
      background={background}
      border={border}
      padding={padding}
    >
      <CycleButton
        {...cycleButtonProps}
        aria-label={`Input font size: ${fontStage}; press for next size`}
        options={["S", "M", "L"]}
        value={fontStageLabel(fontStage)}
        onChange={(value) => onFontStageChange(fontStageFromLabel(value))}
      />
      {showDateTimeButton && (
        <LongPressButton
          {...buttonProps}
          aria-label="Insert current time; hold to insert current date"
          onPress={() => insertCurrentTime(targetRef.current)}
          onLongPress={() => insertCurrentDate(targetRef.current)}
        >
          T <small>D</small>
        </LongPressButton>
      )}
      <LongPressButton
        {...buttonProps}
        aria-label="Move cursor left; hold to copy selection"
        onPress={() => moveCursor(targetRef.current, -1)}
        onLongPress={() => copySelection(targetRef.current)}
      >
        ← <small>CP</small>
      </LongPressButton>
      <LongPressButton
        {...buttonProps}
        aria-label="Move cursor right; hold to paste"
        onPress={() => moveCursor(targetRef.current, 1)}
        onLongPress={() => pasteSelection(targetRef.current)}
      >
        → <small>PS</small>
      </LongPressButton>
      <LongPressButton
        {...buttonProps}
        aria-label="Select word at cursor; hold to select all"
        onPress={() => selectWordAtCursor(targetRef.current)}
        onLongPress={() => selectAll(targetRef.current)}
      >
        W <small>AL</small>
      </LongPressButton>
    </Base>
  );
}

export function moveCursor(element: TextEntryElement | null, direction: -1 | 1) {
  if (!element) return;
  const selection = readSelection(element);
  if (!selection) return;
  const { start, end } = selection;
  const position = direction < 0
    ? start === end ? Math.max(0, start - 1) : start
    : start === end ? Math.min(element.value.length, end + 1) : end;
  element.focus();
  element.setSelectionRange(position, position);
}

export function wordRangeAtCursor(value: string, cursor: number) {
  if (!value) return { start: 0, end: 0 };
  const isWord = (character: string) => /[\p{L}\p{N}_]/u.test(character);
  let anchor = Math.min(Math.max(0, cursor), value.length);
  if (anchor === value.length || !isWord(value[anchor] ?? "")) {
    if (anchor > 0 && isWord(value[anchor - 1])) anchor -= 1;
    else return { start: cursor, end: cursor };
  }
  let start = anchor;
  let end = anchor + 1;
  while (start > 0 && isWord(value[start - 1])) start -= 1;
  while (end < value.length && isWord(value[end])) end += 1;
  return { start, end };
}

export function selectWordAtCursor(element: TextEntryElement | null) {
  if (!element) return;
  const selection = readSelection(element);
  if (!selection) return;
  const range = selection.start === selection.end
    ? wordRangeAtCursor(element.value, selection.start)
    : expandedWordRange(element.value, selection.start, selection.end);
  element.focus();
  element.setSelectionRange(range.start, range.end);
}

export function expandedWordRange(value: string, start: number, end: number) {
  const isWord = (character: string) => /[\p{L}\p{N}_]/u.test(character);
  let nextEnd = Math.min(value.length, end);
  while (nextEnd < value.length && !isWord(value[nextEnd])) nextEnd += 1;
  if (nextEnd < value.length) {
    while (nextEnd < value.length && isWord(value[nextEnd])) nextEnd += 1;
    return { start, end: nextEnd };
  }

  let nextStart = Math.max(0, start);
  while (nextStart > 0 && !isWord(value[nextStart - 1])) nextStart -= 1;
  while (nextStart > 0 && isWord(value[nextStart - 1])) nextStart -= 1;
  return { start: nextStart, end };
}

export function scaledFontSize(
  configuredSize: string,
  stage: InputFontStage,
  configuredStage: Exclude<InputFontStage, "large">,
) {
  const factors = configuredStage === "small"
    ? { small: 1, medium: 1.25, large: 1.5 }
    : { small: 0.8, medium: 1, large: 1.25 };
  const factor = factors[stage];
  return factor === 1 ? configuredSize : `calc(${configuredSize} * ${factor})`;
}

function fontStageLabel(stage: InputFontStage) {
  if (stage === "small") return "S";
  if (stage === "medium") return "M";
  return "L";
}

function fontStageFromLabel(label: string): InputFontStage {
  if (label === "S") return "small";
  if (label === "L") return "large";
  return "medium";
}

export function selectAll(element: TextEntryElement | null) {
  if (!element) return;
  element.focus();
  element.select();
}

export async function copySelection(element: TextEntryElement | null) {
  if (!element) return;
  const selectionRange = readSelection(element);
  if (!selectionRange) return;
  const { start, end } = selectionRange;
  if (start === end) return;
  const selection = element.value.slice(start, end);
  element.focus();
  element.setSelectionRange(start, end);
  try {
    await navigator.clipboard.writeText(selection);
  } catch {
    document.execCommand?.("copy");
  }
}

export async function pasteSelection(element: TextEntryElement | null) {
  if (!element || element.disabled || element.readOnly) return;
  try {
    const text = await navigator.clipboard.readText();
    replaceSelection(element, text);
  } catch {
    element.focus();
  }
}

export function replaceSelection(element: TextEntryElement, text: string) {
  if (element.disabled || element.readOnly) return;
  const selection = readSelection(element);
  if (!selection) return;
  const { start, end } = selection;
  const nextValue = `${element.value.slice(0, start)}${text}${element.value.slice(end)}`;
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, nextValue);
  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    data: text,
    inputType: "insertFromPaste",
  }));
  const position = start + text.length;
  placeCursorAfterControlledUpdate(element, position);
}

export function insertCurrentTime(element: TextEntryElement | null, now = new Date()) {
  if (!element) return;
  replaceSelection(element, formatTime(now));
}

export function insertCurrentDate(element: TextEntryElement | null, now = new Date()) {
  if (!element) return;
  replaceSelection(element, formatDate(now));
}

export function formatTime(date: Date) {
  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function formatDate(date: Date) {
  return `${twoDigits(date.getDate())}.${twoDigits(date.getMonth() + 1)}.${threeDigits(date.getFullYear() % 1_000)}`;
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function threeDigits(value: number) {
  return String(value).padStart(3, "0");
}

function readSelection(element: TextEntryElement) {
  return element.selectionStart === null || element.selectionEnd === null
    ? null
    : { start: element.selectionStart, end: element.selectionEnd };
}

function placeCursorAfterControlledUpdate(
  element: TextEntryElement,
  position: number,
) {
  const place = () => {
    if (!element.isConnected) return;
    element.focus();
    element.setSelectionRange(position, position);
  };
  place();
  queueMicrotask(place);
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(place);
  }
}
