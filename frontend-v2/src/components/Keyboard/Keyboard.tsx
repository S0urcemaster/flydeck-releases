import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Keyboard as KeyboardIcon,
  Mic,
  Space,
} from "lucide-react";

import {
  BackspaceButton,
  type BackspaceButtonProps,
} from "../BackspaceButton";
import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { SymbolButton } from "../SymbolButton";
import { CycleButton, type CycleButtonProps } from "../CycleButton";
import { DialButton, type DialButtonProps } from "../DialButton";
import { LongPressButton, type LongPressButtonProps } from "../LongPressButton";
import {
  ShiftButton,
  type ShiftButtonMode,
  type ShiftButtonProps,
} from "../ShiftButton";
import styles from "./Keyboard.module.css";

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type TextEntryElement = HTMLInputElement | HTMLTextAreaElement;
export type InputFontStage = "small" | "medium" | "large";
export const initialKeyboardFontStage: InputFontStage = "medium";
type KeyboardKey = {
  id: string;
  position: "standard" | "row-two-edge" | "row-three-edge" | "row-four-edge" | "space";
  row: 1 | 2 | 3 | 4;
};

export const keyboardKeys: readonly KeyboardKey[] = [
  ...numberedKeys(1, 10, 1),
  ...numberedKeys(11, 19, 2).map((key, index) => (
    index === 0 || index === 8
      ? { ...key, position: "row-two-edge" as const }
      : key
  )),
  { id: "20", position: "row-three-edge", row: 3 },
  ...numberedKeys(21, 27, 3),
  { id: "28", position: "row-three-edge", row: 3 },
  { id: "29", position: "row-four-edge", row: 4 },
  { id: "30", position: "space", row: 4 },
  { id: "31", position: "row-four-edge", row: 4 },
];

export const lowerKeyboardCharacters = [..."qwertzuiopasdfghjklyxcvbnm"];
export const symbolKeyboardCharacters = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "@", "#", "&", "*", "-", "+", "=", "(", ")", "_", "€", "23", "24", "25", "26", "/",
];
export const commaDialCharacters = [",", '"', "'"] as const;
export const periodDialCharacters = [".", ":", ";"] as const;
export const symbolCycleCharacters = {
  "23": ["!", "?", "%"],
  "24": ["[", "]", "\\"],
  "25": ["{", "}", "|"],
  "26": ["^", "~", "`"],
} as const;
export const emojiKeyboardLayouts = [
  "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨".split(" "),
  "🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳".split(" "),
  "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏 🙌 👐 🤲 🤝 🙏 💪 🫶".split(" "),
] as const;

export type EmojiKeyboardLayout = 0 | 1 | 2;

export type KeyboardShiftState = {
  locked: boolean;
  mode: ShiftButtonMode;
};

export type KeyboardProps = {
  actions?: ReactNode;
  backspaceButtonProps?: Omit<BackspaceButtonProps, "onPress">;
  buttonProps?: Omit<
    LongPressButtonProps,
    "aria-label" | "children" | "onLongPress" | "onPress"
  >;
  buttonHeight?: string;
  cycleButtonProps?: Omit<
    CycleButtonProps,
    "onChange" | "onPress" | "options" | "value"
  >;
  dialButtonProps?: Omit<
    DialButtonProps,
    "onDial" | "onDialComplete" | "options"
  >;
  fontStage: InputFontStage;
  layout?: "inline" | "block";
  onFontStageChange: (stage: InputFontStage) => void;
  onSmartphoneKeyboardRequest?: () => void;
  smartphoneKeyboardEnabled?: boolean;
  shiftButtonProps?: Omit<
    ShiftButtonProps,
    "locked" | "mode" | "onCycle" | "onLock"
  >;
  targetRef: RefObject<TextEntryElement | null>;
  smartphoneButtonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "onClick" | "selected"
  >;
} & BaseStyleProps;

export function Keyboard({
  actions,
  backspaceButtonProps,
  buttonHeight,
  buttonProps,
  cycleButtonProps,
  dialButtonProps,
  fontStage,
  layout = "inline",
  onFontStageChange,
  onSmartphoneKeyboardRequest,
  smartphoneKeyboardEnabled = false,
  shiftButtonProps,
  targetRef,
  smartphoneButtonProps,
  width,
  color,
  background,
  border,
  padding,
  ...baseProps
}: KeyboardProps) {
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(
    null,
  );
  const [dictating, setDictating] = useState(false);
  const [shiftState, setShiftState] = useState<KeyboardShiftState>({
    locked: false,
    mode: "lower",
  });
  const [emojiLayout, setEmojiLayout] =
    useState<EmojiKeyboardLayout | null>(null);
  const [symbolCycleValues, setSymbolCycleValues] = useState<
    Record<keyof typeof symbolCycleCharacters, string>
  >({
    "23": symbolCycleCharacters["23"][0],
    "24": symbolCycleCharacters["24"][0],
    "25": symbolCycleCharacters["25"][0],
    "26": symbolCycleCharacters["26"][0],
  });
  const longPressButtonClassName = buttonProps?.className
    ? `${styles.button} ${buttonProps.className}`
    : styles.button;
  const cycleButtonClassName = cycleButtonProps?.className
    ? `${styles.button} ${cycleButtonProps.className}`
    : styles.button;

  const speechSupported = typeof window !== "undefined"
    && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  function toggleDictation() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const target = targetRef.current;
    const Recognition = typeof window === "undefined"
      ? undefined
      : window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition || !target) return;

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    setDictating(true);
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    const originalValue = target.value;
    const selectionStart = target.selectionStart ?? originalValue.length;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    const segments = new Map<number, string>();

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      for (const index of segments.keys()) {
        if (index >= event.results.length) segments.delete(index);
      }
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        segments.set(index, event.results[index]?.[0]?.transcript ?? "");
      }
      const transcript = mergeSpeechSegments(
        [...segments.entries()]
          .sort(([left], [right]) => left - right)
          .map(([, text]) => text),
      );
      const nextValue = `${originalValue.slice(0, selectionStart)}${transcript}${originalValue.slice(selectionEnd)}`;
      setTextEntryValue(target, nextValue);
      requestAnimationFrame(() => {
        const nextCursor = selectionStart + transcript.length;
        target.focus({ preventScroll: true });
        target.setSelectionRange(nextCursor, nextCursor);
      });
    };
    const finish = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setDictating(false);
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    recognition.start();
  }

  const renderedKeys: ReactNode[] = [];
  for (const key of keyboardKeys) {
    if (key.id === "20") {
      const shiftMode = emojiLayout === null
        ? shiftState.mode
        : emojiLayout === 0
          ? "lower"
          : emojiLayout === 1 ? "upper" : "symbols";
      renderedKeys.push(
        <ShiftButton
          {...buttonProps}
          {...shiftButtonProps}
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          label={emojiLayout === null
            ? undefined
            : `Emoji layout ${emojiLayout + 1} of 3; press for next layout`}
          locked={emojiLayout === null && shiftState.locked}
          mode={shiftMode}
          onCycle={() => {
            if (emojiLayout === null) setShiftState(cycleKeyboardShift);
            else setEmojiLayout(nextEmojiKeyboardLayout(emojiLayout));
          }}
          onLock={() => {
            if (emojiLayout === null) setShiftState(lockKeyboardShift);
            else setEmojiLayout(nextEmojiKeyboardLayout(emojiLayout));
          }}
          symbol={emojiLayout === null
            ? undefined
            : emojiKeyboardLayouts[emojiLayout][0]}
        />,
      );
      continue;
    }
    if (key.id === "28") {
      renderedKeys.push(
        <BackspaceButton
          {...backspaceButtonProps}
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          onPress={() => deleteBackward(targetRef.current)}
        />,
      );
      continue;
    }
    if (key.id === "29") {
      const emojiMode = emojiLayout !== null;
      const toggleEmojiMode = () => {
        setEmojiLayout((current) => current === null ? 0 : null);
        setShiftState({ locked: false, mode: "lower" });
      };
      renderedKeys.push(
        <ShiftButton
          {...buttonProps}
          {...shiftButtonProps}
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          label={emojiMode
            ? "Emoji keyboard active; press for text keyboard"
            : "Emoji keyboard; press to activate"}
          locked={false}
          mode={emojiMode ? "upper" : "lower"}
          onCycle={toggleEmojiMode}
          onLock={toggleEmojiMode}
          symbol={emojiKeyboardLayouts[0][0]}
        />,
      );
      continue;
    }
    if (key.id === "31") {
      renderedKeys.push(
        <Button
          {...smartphoneButtonProps}
          aria-label="Enter"
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          onClick={() => insertKeyboardText(targetRef.current, "\n")}
          onPointerDown={(event) => event.preventDefault()}
        >
          ↵
        </Button>,
      );
      continue;
    }
    const segments = key.position === "space" ? [1, 2, 3] : [null];
    const character = emojiLayout === null
      ? keyboardCharacter(key.id, shiftState.mode)
      : emojiKeyboardCharacter(key.id, emojiLayout);
    const letterDialOptions = emojiLayout === null
      ? keyboardLetterDialOptions(key.id, shiftState.mode)
      : null;
    if (letterDialOptions) {
      renderedKeys.push(
        <DialButton
          {...dialButtonProps}
          aria-label={`${letterDialOptions[0]} or ${letterDialOptions[1]}`}
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          options={letterDialOptions}
          onDial={(dialCharacter, replacePrevious) => insertDialKeyboardText(
            targetRef.current,
            dialCharacter,
            replacePrevious,
            letterDialOptions,
          )}
          onDialComplete={() => {
            setShiftState(releaseKeyboardShiftAfterCharacter);
          }}
        />,
      );
      continue;
    }
    if (key.id === "22"
      && emojiLayout === null
      && shiftState.mode === "symbols") {
      renderedKeys.push(
        <DialButton
          {...dialButtonProps}
          aria-label="Currency Euro or Dollar"
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          options={["€", "$"]}
          onDial={(character, replacePrevious) => insertDialKeyboardText(
            targetRef.current,
            character,
            replacePrevious,
            ["€", "$"],
          )}
        />,
      );
      continue;
    }
    if ((key.id === "18" || key.id === "19")
      && emojiLayout === null
      && shiftState.mode === "symbols") {
      const options = key.id === "18" ? ["(", "<"] : [")", ">"];
      renderedKeys.push(
        <DialButton
          {...dialButtonProps}
          aria-label={key.id === "18"
            ? "Opening parenthesis or less-than sign"
            : "Closing parenthesis or greater-than sign"}
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          options={options}
          onDial={(dialCharacter, replacePrevious) => insertDialKeyboardText(
            targetRef.current,
            dialCharacter,
            replacePrevious,
            options,
          )}
        />,
      );
      continue;
    }
    if (["23", "24", "25", "26"].includes(key.id)
      && emojiLayout === null
      && shiftState.mode === "symbols") {
      const cycleKeyId = key.id as keyof typeof symbolCycleCharacters;
      const options = symbolCycleCharacters[cycleKeyId];
      renderedKeys.push(
        <CycleButton
          {...cycleButtonProps}
          aria-label={`Symbols ${options.join(" ")}`}
          className={styles.key}
          data-key-id={key.id}
          data-position={key.position}
          data-row={key.row}
          key={key.id}
          height={buttonHeight}
          options={options}
          value={symbolCycleValues[cycleKeyId]}
          onPress={(symbol) => insertKeyboardText(targetRef.current, symbol)}
          onChange={(value) => setSymbolCycleValues((current) => ({
            ...current,
            [cycleKeyId]: value,
          }))}
        />,
      );
      continue;
    }
    for (const segment of segments) {
      if (key.position === "space" && (segment === 1 || segment === 3)) {
        const options = segment === 1
          ? commaDialCharacters
          : periodDialCharacters;
        renderedKeys.push(
          <DialButton
            {...dialButtonProps}
            aria-label={segment === 1
              ? "Comma, double quote, or single quote"
              : "Period, colon, or semicolon"}
            className={styles.key}
            data-key-id={key.id}
            data-key-segment={segment}
            data-position={key.position}
            data-row={key.row}
            key={`${key.id}-${segment}`}
            height={buttonHeight}
            options={options}
            onDial={(dialCharacter, replacePrevious) => insertDialKeyboardText(
              targetRef.current,
              dialCharacter,
              replacePrevious,
              options,
            )}
          />,
        );
        continue;
      }
      renderedKeys.push(
        <Button
          {...smartphoneButtonProps}
          aria-label={segment === null
            ? character ?? `Keyboard key ${key.id}`
            : segment === 1
              ? "Comma"
              : segment === 2
                ? "Space"
                : "Period"}
          className={styles.key}
          data-key-id={key.id}
          data-key-segment={segment ?? undefined}
          data-position={key.position}
          data-row={key.row}
          key={`${key.id}-${segment ?? "whole"}`}
          height={buttonHeight}
          onClick={() => {
            const target = targetRef.current;
            if (key.position === "space" && segment === 1) {
              insertKeyboardText(target, ",");
            } else if (key.position === "space" && segment === 2) {
              insertKeyboardText(target, " ");
            } else if (key.position === "space" && segment === 3) {
              insertKeyboardText(target, ".");
            } else if (character) {
              insertKeyboardText(target, character);
              if (emojiLayout === null) {
                setShiftState(releaseKeyboardShiftAfterCharacter);
              }
            } else target?.focus({ preventScroll: true });
          }}
          onPointerDown={(event) => event.preventDefault()}
        >
          {key.position === "space"
            ? segment === 1
              ? ","
              : segment === 2
                ? <Space className={styles.symbol} aria-hidden="true" />
                : "."
            : segment === null
              ? character ?? key.id
              : null}
        </Button>,
      );
    }
  }

  return (
    <Base
      {...baseProps}
      className={styles.root}
      data-layout={layout}
      componentName="Keyboard"
      color={color}
      background={background}
      border={border}
      padding={padding}
      width={layout === "block" ? "100%" : width}
    >
      <div className={styles.toolbar}>
        <Button
          {...smartphoneButtonProps}
          aria-label={smartphoneKeyboardEnabled
            ? "Hide smartphone keyboard"
            : "Show smartphone keyboard"}
          className={styles.button}
          height={buttonHeight}
          onClick={onSmartphoneKeyboardRequest}
          onPointerDown={(event) => event.preventDefault()}
          selected={smartphoneKeyboardEnabled}
        >
          <KeyboardIcon className={styles.symbol} aria-hidden="true" />
        </Button>
        <CycleButton
          {...cycleButtonProps}
          className={cycleButtonClassName}
          height={buttonHeight}
          aria-label={`Input font size: ${fontStage}; press for next size`}
          options={["S", "M", "L"]}
          value={fontStageLabel(fontStage)}
          onChange={(value) => onFontStageChange(fontStageFromLabel(value))}
        />
        <LongPressButton
          {...buttonProps}
          className={longPressButtonClassName}
          height={buttonHeight}
          aria-label="Insert current time; hold to insert current date"
          onPress={() => insertCurrentTime(targetRef.current)}
          onLongPress={() => insertCurrentDate(targetRef.current)}
        >
          T <small>D</small>
        </LongPressButton>
        <LongPressButton
          {...buttonProps}
          className={longPressButtonClassName}
          height={buttonHeight}
          aria-label="Move cursor left; hold to copy selection"
          onPress={() => moveCursor(targetRef.current, -1)}
          onLongPress={() => copySelection(targetRef.current)}
        >
            <ArrowLeft className={styles.symbol} aria-hidden="true" /> <small>CP</small>
        </LongPressButton>
        <LongPressButton
          {...buttonProps}
          className={longPressButtonClassName}
          height={buttonHeight}
          aria-label="Move cursor right; hold to paste"
          onPress={() => moveCursor(targetRef.current, 1)}
          onLongPress={() => pasteSelection(targetRef.current)}
        >
            <ArrowRight className={styles.symbol} aria-hidden="true" /> <small>PS</small>
        </LongPressButton>
        <LongPressButton
          {...buttonProps}
          className={longPressButtonClassName}
          height={buttonHeight}
          aria-label="Select word at cursor; hold to select all"
          onPress={() => selectWordAtCursor(targetRef.current)}
          onLongPress={() => selectAll(targetRef.current)}
        >
          W <small>AL</small>
        </LongPressButton>
      </div>
      <div className={styles.keys} aria-label="Keyboard keys">
        {renderedKeys}
      </div>
      <div className={styles.actions}>
        <SymbolButton
          {...buttonProps}
          activeColor="COLOR_SPEECH"
          aria-label={dictating ? "Stop dictation" : "Start dictation"}
          background="COLOR_SPEECH"
          className={styles.button}
          disabled={!speechSupported}
          selected={dictating}
          symbol={<Mic size="1em" />}
          onPointerDown={(event) => event.preventDefault()}
          onClick={toggleDictation}
        />
        {actions}
      </div>
    </Base>
  );
}

export function nextKeyboardLayout(
  current: ShiftButtonMode,
): ShiftButtonMode {
  if (current === "lower") return "upper";
  if (current === "upper") return "symbols";
  return "lower";
}

export function cycleKeyboardShift(
  current: KeyboardShiftState,
): KeyboardShiftState {
  return current.locked
    ? { locked: false, mode: "lower" }
    : { locked: false, mode: nextKeyboardLayout(current.mode) };
}

export function lockKeyboardShift(
  current: KeyboardShiftState,
): KeyboardShiftState {
  return {
    locked: true,
    mode: current.mode === "lower" ? "upper" : current.mode,
  };
}

export function releaseKeyboardShiftAfterCharacter(
  current: KeyboardShiftState,
): KeyboardShiftState {
  return current.locked || current.mode === "symbols"
    ? current
    : { locked: false, mode: "lower" };
}

export function keyboardCharacter(
  keyId: string,
  layout: ShiftButtonMode,
) {
  const index = keyboardCharacterIndex(keyId);
  if (index < 0) return null;
  if (layout === "symbols") return symbolKeyboardCharacters[index] ?? null;
  const character = lowerKeyboardCharacters[index] ?? null;
  return layout === "upper" ? character?.toLocaleUpperCase() ?? null : character;
}

export function keyboardLetterDialOptions(
  keyId: string,
  layout: ShiftButtonMode,
): readonly [string, string] | null {
  if (layout === "symbols") return null;
  const options = keyId === "07"
    ? ["u", "ü"] as const
    : keyId === "09"
      ? ["o", "ö"] as const
      : keyId === "11"
        ? ["a", "ä"] as const
        : null;
  if (!options || layout === "lower") return options;
  return [options[0].toLocaleUpperCase(), options[1].toLocaleUpperCase()];
}

export function emojiKeyboardCharacter(
  keyId: string,
  layout: EmojiKeyboardLayout,
) {
  const index = keyboardCharacterIndex(keyId);
  return index < 0 ? null : emojiKeyboardLayouts[layout][index] ?? null;
}

export function nextEmojiKeyboardLayout(
  current: EmojiKeyboardLayout,
): EmojiKeyboardLayout {
  return ((current + 1) % emojiKeyboardLayouts.length) as EmojiKeyboardLayout;
}

function keyboardCharacterIndex(keyId: string) {
  const numericId = Number(keyId);
  return numericId >= 1 && numericId <= 19
    ? numericId - 1
    : numericId >= 21 && numericId <= 27
      ? numericId - 2
      : -1;
}

function numberedKeys(
  start: number,
  end: number,
  row: KeyboardKey["row"],
): KeyboardKey[] {
  return Array.from({ length: end - start + 1 }, (_, index) => ({
    id: String(start + index).padStart(2, "0"),
    position: "standard",
    row,
  }));
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
  configuredSize: string | undefined,
  stage: InputFontStage,
  configuredStage: Exclude<InputFontStage, "large">,
) {
  if (configuredSize === undefined) return undefined;
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

export function mergeSpeechSegments(segments: string[]) {
  const words: string[] = [];
  for (const segment of segments) {
    const nextWords = segment.trim().split(/\s+/).filter(Boolean);
    if (nextWords.length === 0) continue;
    const normalizedWords = words.map(normalizeSpeechWord);
    const normalizedNextWords = nextWords.map(normalizeSpeechWord);
    let commonPrefix = 0;
    while (
      commonPrefix < normalizedWords.length
      && commonPrefix < normalizedNextWords.length
      && normalizedWords[commonPrefix] === normalizedNextWords[commonPrefix]
    ) {
      commonPrefix += 1;
    }
    const cumulativeThreshold = Math.min(
      2,
      normalizedWords.length,
      normalizedNextWords.length,
    );
    if (cumulativeThreshold > 0 && commonPrefix >= cumulativeThreshold) {
      words.splice(0, words.length, ...nextWords);
      continue;
    }
    let overlap = Math.min(words.length, nextWords.length);
    while (overlap > 0) {
      const tail = normalizedWords.slice(-overlap);
      const head = normalizedNextWords.slice(0, overlap);
      if (tail.every((word, index) => word === head[index])) break;
      overlap -= 1;
    }
    words.push(...nextWords.slice(overlap));
  }
  return words.join(" ");
}

function normalizeSpeechWord(word: string) {
  return word
    .normalize("NFKC")
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function setTextEntryValue(element: TextEntryElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
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

export function insertKeyboardText(
  element: TextEntryElement | null,
  text: string,
) {
  if (!element) return;
  replaceSelectionWithInputType(element, text, "insertText");
}

export function insertDialKeyboardText(
  element: TextEntryElement | null,
  text: string,
  replacePrevious: boolean,
  dialOptions: readonly string[],
) {
  if (!element || element.disabled || element.readOnly) return;
  const selection = readSelection(element);
  if (!selection) return;
  const { start, end } = selection;
  const previousCharacter = start === end
    ? previousGrapheme(element.value, start)
    : "";
  if (replacePrevious && dialOptions.includes(previousCharacter)) {
    replaceTextRange(
      element,
      start - previousCharacter.length,
      end,
      text,
      "insertText",
    );
    return;
  }
  replaceTextRange(element, start, end, text, "insertText");
}

export function deleteBackward(element: TextEntryElement | null) {
  if (!element || element.disabled || element.readOnly) return;
  const selection = readSelection(element);
  if (!selection) return;
  const { start, end } = selection;
  if (start === 0 && end === 0) return;
  const previousCharacter = start === end
    ? previousGrapheme(element.value, start)
    : "";
  replaceTextRange(
    element,
    start - previousCharacter.length,
    end,
    "",
    "deleteContentBackward",
  );
}

export function previousGrapheme(value: string, cursor: number) {
  const prefix = value.slice(0, cursor);
  if (!prefix) return "";
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" })
      .segment(prefix)].at(-1)?.segment ?? "";
  }
  return Array.from(prefix).at(-1) ?? "";
}

export function replaceSelection(element: TextEntryElement, text: string) {
  replaceSelectionWithInputType(element, text, "insertFromPaste");
}

function replaceSelectionWithInputType(
  element: TextEntryElement,
  text: string,
  inputType: "insertFromPaste" | "insertText",
) {
  if (element.disabled || element.readOnly) return;
  const selection = readSelection(element);
  if (!selection) return;
  const { start, end } = selection;
  replaceTextRange(element, start, end, text, inputType);
}

function replaceTextRange(
  element: TextEntryElement,
  start: number,
  end: number,
  text: string,
  inputType: "deleteContentBackward" | "insertFromPaste" | "insertText",
) {
  const nextValue = `${element.value.slice(0, start)}${text}${element.value.slice(end)}`;
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, nextValue);
  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    data: text,
    inputType,
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
