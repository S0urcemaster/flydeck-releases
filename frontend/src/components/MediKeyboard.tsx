import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

export type MediKeyboardAction = "" | "BACKSPACE" | "SHIFT" | "SPACE" | "TIME" | "ENTER";

type MediKeyboardProps = {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (value: string) => void;
  actions?: MediKeyboardAction[];
  onEnter?: () => void;
};

type PendingKey = {
  key: number;
  characters: string[];
  characterIndex: number;
  position: number;
};

type ShiftMode = "off" | "once" | "locked";

export const mediLetterKeys = [
  "ao1", "bp2", "cq3", "dr4", "es5",
  "ft6", "gu7", "hv8", "iw9", "jx0",
  "ky", "lz", "mä", "nöü",
];

const shiftedNumberCharacters: Record<string, string> = {
  "1": "!",
  "2": "\"",
  "3": "§",
  "4": "$",
  "5": "%",
  "6": "&",
  "7": "/",
  "8": "(",
  "9": ")",
  "0": "=",
};

export function getMediKeyCharacters(characters: string, shifted: boolean) {
  if (!shifted) return Array.from(characters);
  return Array.from(characters, (character) =>
    shiftedNumberCharacters[character] ?? character.toLocaleUpperCase("de"));
}

const defaultCustomKeys = [".,?!", "-_:;", "()[]", "/\\|", "@#€$"];

export function MediKeyboard({
  inputRef,
  value,
  onValueChange,
  actions = ["BACKSPACE", "SHIFT", "SPACE", "TIME", "ENTER"],
  onEnter,
}: MediKeyboardProps) {
  const [shiftMode, setShiftMode] = useState<ShiftMode>("once");
  const [customKeys, setCustomKeys] = useLocalStorage<string[]>(
    "flydeck.mediKeyboard.customKeys",
    defaultCustomKeys,
    (stored) => Array.isArray(stored) && stored.length === 5 && stored.every((entry) => typeof entry === "string" && entry.length > 0)
      ? stored
      : null,
  );
  const pendingRef = useRef<PendingKey | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const customHoldTimerRef = useRef<number | null>(null);
  const customHoldTriggeredRef = useRef(false);
  const pendingCursorRef = useRef<number | null>(null);
  const lastShiftTapRef = useRef(0);

  useLayoutEffect(() => {
    const position = pendingCursorRef.current;
    if (position === null) return;
    pendingCursorRef.current = null;
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(position, position);
  }, [inputRef, value]);

  useEffect(() => () => {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
  }, []);

  function restoreCursor(position: number) {
    pendingCursorRef.current = position;
  }

  function commitPending() {
    pendingRef.current = null;
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
  }

  function scheduleCommit() {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(commitPending, 850);
  }

  function pressMultiTapKey(key: number, characters: string) {
    const characterList = getMediKeyCharacters(characters, shiftMode !== "off");
    if (characterList.length === 0) return;
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const pending = pendingRef.current;
    const previousCharacter = pending?.characters[pending.characterIndex];

    if (pending?.key === key && previousCharacter && start === pending.position + previousCharacter.length && end === start) {
      const characterIndex = (pending.characterIndex + 1) % pending.characters.length;
      const character = pending.characters[characterIndex];
      onValueChange(`${value.slice(0, pending.position)}${character}${value.slice(pending.position + previousCharacter.length)}`);
      pendingRef.current = { ...pending, characterIndex };
      restoreCursor(pending.position + character.length);
      scheduleCommit();
      return;
    }

    commitPending();
    const character = characterList[0];
    onValueChange(`${value.slice(0, start)}${character}${value.slice(end)}`);
    pendingRef.current = { key, characters: characterList, characterIndex: 0, position: start };
    restoreCursor(start + character.length);
    scheduleCommit();
    if (shiftMode === "once" && /^\p{L}$/u.test(character)) setShiftMode("off");
  }

  function replaceSelection(text: string) {
    commitPending();
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    onValueChange(`${value.slice(0, start)}${text}${value.slice(end)}`);
    restoreCursor(start + text.length);
  }

  function backspace() {
    commitPending();
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    if (start !== end) {
      onValueChange(`${value.slice(0, start)}${value.slice(end)}`);
      restoreCursor(start);
      return;
    }
    if (start === 0) return;
    const prefix = Array.from(value.slice(0, start));
    prefix.pop();
    const nextPrefix = prefix.join("");
    onValueChange(`${nextPrefix}${value.slice(start)}`);
    restoreCursor(nextPrefix.length);
  }

  function toggleShift(now: number) {
    commitPending();
    if (now - lastShiftTapRef.current <= 500) {
      lastShiftTapRef.current = 0;
      setShiftMode("locked");
      return;
    }
    lastShiftTapRef.current = now;
    setShiftMode((current) => current === "off" ? "once" : "off");
  }

  function insertTime() {
    const now = new Date();
    const pad = (part: number) => String(part).padStart(2, "0");
    replaceSelection(`${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${pad(now.getFullYear() % 100)} ${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }

  function beginCustomKey(event: PointerEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    customHoldTriggeredRef.current = false;
    if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
    customHoldTimerRef.current = window.setTimeout(() => {
      customHoldTimerRef.current = null;
      const input = inputRef.current;
      const start = input?.selectionStart;
      const end = input?.selectionEnd;
      if (!input || start === null || start === undefined || end === null || end === undefined || start === end) return;
      const selectedText = value.slice(start, end);
      if (!selectedText) return;
      customHoldTriggeredRef.current = true;
      commitPending();
      setCustomKeys((current) => current.map((characters, currentIndex) => currentIndex === index ? selectedText : characters));
      input.focus({ preventScroll: true });
      input.setSelectionRange(end, end);
    }, 500);
  }

  function finishCustomKey(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
    customHoldTimerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const held = customHoldTriggeredRef.current;
    customHoldTriggeredRef.current = false;
    if (!held) pressMultiTapKey(15 + index, customKeys[index] ?? "");
  }

  function runAction(action: MediKeyboardAction, eventTime: number) {
    if (action === "BACKSPACE") backspace();
    if (action === "SHIFT") toggleShift(eventTime);
    if (action === "SPACE") replaceSelection(" ");
    if (action === "TIME") insertTime();
    if (action === "ENTER") (onEnter ?? (() => replaceSelection("\n")))();
  }

  function actionLabel(action: MediKeyboardAction) {
    if (action === "BACKSPACE") return "⌫";
    if (action === "SHIFT") return shiftMode === "locked" ? "⇧⇧" : "⇧";
    if (action === "SPACE") return "␣";
    if (action === "TIME") return "◷";
    if (action === "ENTER") return "↵";
    return "";
  }

  return (
    <div className="medi-keyboard" aria-label="MediKeyboard">
      {mediLetterKeys.map((characters, index) => {
        const displayedCharacters = getMediKeyCharacters(characters, shiftMode !== "off");
        return (
          <button
            key={`letter-${index}`}
            type="button"
            className="medi-letter-key"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => pressMultiTapKey(index, characters)}
            aria-label={displayedCharacters.join(" ")}
          >
            <strong>{displayedCharacters[0]}</strong>
            <small>{displayedCharacters.slice(1).join("")}</small>
          </button>
        );
      })}
      <button
        type="button"
        className={`medi-action-key ${shiftMode !== "off" ? "active" : ""} ${shiftMode === "locked" ? "locked" : ""}`.trim()}
        onPointerDown={(event) => event.preventDefault()}
        onClick={(event) => toggleShift(event.timeStamp)}
        aria-label={shiftMode === "locked" ? "Disable caps lock" : "Shift"}
        aria-pressed={shiftMode !== "off"}
      >{shiftMode === "locked" ? "⇧⇧" : "⇧"}</button>
      {customKeys.map((characters, index) => (
        <button
          key={`custom-${index}`}
          type="button"
          className="medi-custom-key"
          onPointerDown={(event) => beginCustomKey(event, index)}
          onPointerUp={(event) => finishCustomKey(event, index)}
          onPointerCancel={() => {
            if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
            customHoldTimerRef.current = null;
            customHoldTriggeredRef.current = false;
          }}
          onLostPointerCapture={() => {
            if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
            customHoldTimerRef.current = null;
          }}
          onClick={(event) => {
            if (event.detail === 0) pressMultiTapKey(15 + index, characters);
          }}
          title="Long press to use the selected text"
          aria-label={`Programmable characters ${characters}`}
        >{characters}</button>
      ))}
      {Array.from({ length: 5 }, (_, index) => actions[index] ?? "").map((action, index) => (
        <button
          key={`action-${index}`}
          type="button"
          className={`medi-action-key ${action === "SHIFT" && shiftMode !== "off" ? "active" : ""} ${action === "SHIFT" && shiftMode === "locked" ? "locked" : ""}`.trim()}
          onPointerDown={(event) => event.preventDefault()}
          onClick={(event) => runAction(action, event.timeStamp)}
          disabled={!action}
          aria-label={action || `Unassigned MediKeyboard action ${index + 1}`}
        >{actionLabel(action)}</button>
      ))}
    </div>
  );
}
