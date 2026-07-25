import { Fragment, useEffect, useRef, useState, type RefObject } from "react";

type PhoneKeyboardProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (value: string) => void;
};

type PendingCharacter = {
  key: string;
  characters: string[];
  characterIndex: number;
  position: number;
};

type ShiftMode = "off" | "once" | "locked";

const phoneKeys = [
  { key: "1", characters: ".,?!" },
  { key: "2", characters: "ABC" },
  { key: "3", characters: "DEF" },
  { key: "4", characters: "GHI" },
  { key: "5", characters: "JKL" },
  { key: "6", characters: "MNO" },
  { key: "7", characters: "PQRS" },
  { key: "8", characters: "TUV" },
  { key: "9", characters: "WXYZ" },
  { key: "*", characters: "*" },
  { key: "0", characters: " " },
  { key: "#", characters: "#" },
];

const symbolKeys = [
  { key: "1", characters: "-:+*" },
  { key: "2", characters: "/%\\|" },
  { key: "3", characters: ";^°~" },
  { key: "4", characters: "()[]" },
  { key: "5", characters: "<>{}" },
  { key: "6", characters: "_&" },
  { key: "7", characters: "$@#€" },
  { key: "8", characters: "\"'`" },
  { key: "9", characters: "" },
  { key: "*", characters: "" },
  { key: "0", characters: "" },
  { key: "#", characters: "" },
];

const emojiKeys = [
  { key: "1", characters: "😀😃😄😁" },
  { key: "2", characters: "😂😊😉🙂" },
  { key: "3", characters: "😍😘😎🤩" },
  { key: "4", characters: "👍👎👌👏" },
  { key: "5", characters: "🙏💪👋🤝" },
  { key: "6", characters: "✅❌💚🔥" },
  { key: "7", characters: "" },
  { key: "8", characters: "" },
  { key: "9", characters: "" },
  { key: "*", characters: "" },
  { key: "0", characters: "" },
  { key: "#", characters: "" },
];

export function PhoneKeyboard({ textareaRef, value, onValueChange }: PhoneKeyboardProps) {
  const pendingRef = useRef<PendingCharacter | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const backspaceDelayRef = useRef<number | null>(null);
  const backspaceRepeatRef = useRef<number | null>(null);
  const keyHoldTimerRef = useRef<number | null>(null);
  const keyHoldTriggeredRef = useRef(false);
  const valueRef = useRef(value);
  const [shiftMode, setShiftMode] = useState<ShiftMode>("once");
  const [symbolMode, setSymbolMode] = useState(false);
  const [emojiMode, setEmojiMode] = useState(false);
  const lastShiftTapRef = useRef(0);

  valueRef.current = value;

  useEffect(() => () => {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    stopBackspaceRepeat();
    cancelKeyPress();
  }, []);

  function scheduleCommit() {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      pendingRef.current = null;
      commitTimerRef.current = null;
    }, 850);
  }

  function commitPending() {
    pendingRef.current = null;
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
  }

  function restoreCursor(position: number) {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(position, position);
    });
  }

  function pressKey(key: string, characters: string) {
    lastShiftTapRef.current = 0;
    const characterList = Array.from(characters);
    if (characterList.length === 0) return;
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? value.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const pending = pendingRef.current;

    const pendingCharacter = pending?.characters[pending.characterIndex];
    if (pending?.key === key && pendingCharacter && selectionStart === pending.position + pendingCharacter.length && selectionEnd === selectionStart) {
      const characterIndex = (pending.characterIndex + 1) % pending.characters.length;
      const nextCharacter = pending.characters[characterIndex];
      const nextValue = `${value.slice(0, pending.position)}${nextCharacter}${value.slice(pending.position + pendingCharacter.length)}`;
      pendingRef.current = { ...pending, characterIndex };
      onValueChange(nextValue);
      restoreCursor(pending.position + nextCharacter.length);
      scheduleCommit();
      return;
    }

    const nextValue = `${value.slice(0, selectionStart)}${characterList[0]}${value.slice(selectionEnd)}`;
    pendingRef.current = { key, characters: characterList, characterIndex: 0, position: selectionStart };
    onValueChange(nextValue);
    restoreCursor(selectionStart + characterList[0].length);
    scheduleCommit();
    if (!symbolMode && shiftMode === "once" && /^[A-Z]$/.test(characterList[0])) setShiftMode("off");
  }

  function replaceSelection(text: string) {
    lastShiftTapRef.current = 0;
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? value.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    commitPending();
    onValueChange(`${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`);
    restoreCursor(selectionStart + text.length);
  }

  function backspace() {
    lastShiftTapRef.current = 0;
    const textarea = textareaRef.current;
    const currentValue = valueRef.current;
    const selectionStart = textarea?.selectionStart ?? currentValue.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    commitPending();
    if (selectionStart !== selectionEnd) {
      const nextValue = `${currentValue.slice(0, selectionStart)}${currentValue.slice(selectionEnd)}`;
      valueRef.current = nextValue;
      onValueChange(nextValue);
      restoreCursor(selectionStart);
      return;
    }
    if (selectionStart === 0) return;
    const nextValue = `${currentValue.slice(0, selectionStart - 1)}${currentValue.slice(selectionStart)}`;
    valueRef.current = nextValue;
    onValueChange(nextValue);
    restoreCursor(selectionStart - 1);
  }

  function stopBackspaceRepeat() {
    if (backspaceDelayRef.current !== null) window.clearTimeout(backspaceDelayRef.current);
    if (backspaceRepeatRef.current !== null) window.clearInterval(backspaceRepeatRef.current);
    backspaceDelayRef.current = null;
    backspaceRepeatRef.current = null;
  }

  function startBackspaceRepeat() {
    stopBackspaceRepeat();
    backspace();
    backspaceDelayRef.current = window.setTimeout(() => {
      backspaceRepeatRef.current = window.setInterval(backspace, 70);
    }, 450);
  }

  function cancelKeyPress() {
    if (keyHoldTimerRef.current !== null) window.clearTimeout(keyHoldTimerRef.current);
    keyHoldTimerRef.current = null;
  }

  function startKeyPress(key: string) {
    cancelKeyPress();
    keyHoldTriggeredRef.current = false;
    keyHoldTimerRef.current = window.setTimeout(() => {
      keyHoldTimerRef.current = null;
      keyHoldTriggeredRef.current = true;
      replaceSelection(key);
    }, 450);
  }

  function finishKeyPress(key: string, characters: string) {
    const held = keyHoldTriggeredRef.current;
    cancelKeyPress();
    keyHoldTriggeredRef.current = false;
    if (!held && characters) pressKey(key, characters);
  }

  function toggleShift() {
    const now = performance.now();
    if (now - lastShiftTapRef.current <= 500) {
      lastShiftTapRef.current = 0;
      setShiftMode("locked");
      return;
    }
    lastShiftTapRef.current = now;
    setShiftMode((current) => current === "off" ? "once" : "off");
  }

  const activeKeys = symbolMode
    ? emojiMode ? emojiKeys : symbolKeys
    : phoneKeys.map(({ key, characters }) => ({
      key,
      characters: shiftMode === "off" ? characters.toLowerCase() : characters.toUpperCase(),
    }));

  return (
    <div className="phone-keyboard" aria-label="Phone multi-tap keyboard">
      {activeKeys.map(({ key, characters }, index) => (
        <Fragment key={key}>
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              startKeyPress(key);
            }}
            onPointerUp={() => {
              finishKeyPress(key, characters);
            }}
            onPointerCancel={cancelKeyPress}
            onLostPointerCapture={cancelKeyPress}
            onClick={(event) => {
              if (event.detail === 0 && characters) pressKey(key, characters);
            }}
            aria-label={`${key} ${characters.trim()}`}
          >
            <span className="phone-key-number">{key}</span>
            <span className={`phone-key-letters ${symbolMode ? "phone-key-symbol-letters" : ""}`.trim()}>{characters.replace(" ", "␠")}</span>
          </button>
          {index === 2 && (
            <button
              type="button"
              className="phone-keyboard-control"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                startBackspaceRepeat();
              }}
              onPointerUp={stopBackspaceRepeat}
              onPointerCancel={stopBackspaceRepeat}
              onLostPointerCapture={stopBackspaceRepeat}
              onClick={(event) => {
                if (event.detail === 0) backspace();
              }}
              aria-label="Backspace"
            >⌫</button>
          )}
          {index === 5 && (
            <button type="button" className={`phone-keyboard-control ${symbolMode ? "active" : ""}`} onPointerDown={(event) => event.preventDefault()} onClick={() => {
              lastShiftTapRef.current = 0;
              commitPending();
              setSymbolMode((current) => {
                if (current) setEmojiMode(false);
                return !current;
              });
            }} aria-label="Toggle symbols">#+=</button>
          )}
          {index === 8 && (
            <button
              type="button"
              className={`phone-keyboard-control ${(symbolMode ? emojiMode : shiftMode !== "off") ? "active" : ""} ${!symbolMode && shiftMode === "locked" ? "locked" : ""}`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                commitPending();
                if (symbolMode) setEmojiMode((current) => !current);
                else toggleShift();
              }}
              aria-label={symbolMode ? "Toggle emoji layout" : shiftMode === "locked" ? "Disable caps lock" : "Shift"}
              aria-pressed={symbolMode ? emojiMode : shiftMode !== "off"}
            >⇧</button>
          )}
          {index === 11 && (
            <button type="button" className="phone-keyboard-control" onPointerDown={(event) => event.preventDefault()} onClick={() => replaceSelection("\n")} aria-label="Enter">↵</button>
          )}
        </Fragment>
      ))}
    </div>
  );
}
