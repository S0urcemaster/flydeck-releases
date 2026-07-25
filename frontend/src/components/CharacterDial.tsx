import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { RadialMark } from "./RadialMark";

type CharacterDialProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (value: string) => void;
  corners?: CharacterDialCorners;
  defaultSize?: "small" | "medium" | "large";
  rightButtons?: CharacterDialCornerAction[];
  defaultDwell?: DwellMode;
};

export type CharacterDialCornerAction = "" | "SPACE" | "DIALERSIZE" | "TIME" | "DWELL";
export type CharacterDialCorners = Record<"nw" | "ne" | "sw" | "se", CharacterDialCornerAction>;
export type DwellMode = "off" | "0.2" | "0.3" | "0.4";

type ShiftMode = "off" | "once" | "locked";
export type DialSize = "small" | "compact" | "large";

const baseDialCharacters = Array.from(
  "abcdefghijklmnopqrstuvwxyzäöüß0123456789.,?!-_:;()[]{}<>/\\@#€$%&+*=\"'|^~😀😂😊😉😍😎👍👎👌👏🙏💪👋✅❌❤🔥💡📌📅",
);
const mediumDialCharacters = Array.from("§°…–—•·±÷×≠≈≤≥→←↑↓✓★♥☀☂");
const largeDialCharacters = Array.from("©®™µ¶†‡∞∑√∆∫≈≡⊕⊗◆◇○●□■☆");
const defaultCustomKeys = [".,?!", "-_:;", "()[]", "{}<>", "/\\|", "@#€$", "\"'`~"];

export function getCharacterPages(size: DialSize) {
  const allCharacters = [
    ...baseDialCharacters,
    ...(size === "small" ? [] : mediumDialCharacters),
    ...(size === "large" ? largeDialCharacters : []),
  ];
  const charactersPerPage = size === "small" ? 19 : size === "compact" ? 21 : 23;
  const pageCount = size === "small" ? 4 : size === "compact" ? 5 : 6;
  const dialCharacters = allCharacters.slice(0, charactersPerPage * pageCount);
  return Array.from(
    { length: pageCount },
    (_, page) => dialCharacters.slice(page * charactersPerPage, (page + 1) * charactersPerPage),
  );
}

function pointerPosition(element: HTMLElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect();
  const x = clientX - (bounds.left + bounds.width / 2);
  const y = clientY - (bounds.top + bounds.height / 2);
  const radians = Math.atan2(y, x);
  return {
    angle: (radians * 180 / Math.PI + 450) % 360,
    radius: Math.hypot(x, y) / (Math.min(bounds.width, bounds.height) / 2),
  };
}

function angleIndex(angle: number, count: number) {
  return Math.min(count - 1, Math.floor(angle / 360 * count));
}

export function CharacterDial({
  textareaRef,
  value,
  onValueChange,
  corners = { nw: "TIME", ne: "", sw: "DIALERSIZE", se: "SPACE" },
  defaultSize = "small",
  rightButtons = ["", "", "", "", ""],
  defaultDwell = "0.3",
}: CharacterDialProps) {
  const [page, setPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shiftMode, setShiftMode] = useState<ShiftMode>("once");
  const [dialSize, setDialSize] = useState<DialSize>(() => defaultSize === "medium" ? "compact" : defaultSize);
  const [dwellMode, setDwellMode] = useState<DwellMode>(defaultDwell);
  const [customKeys, setCustomKeys] = useLocalStorage<string[]>(
    "flydeck.characterDial.customKeys",
    defaultCustomKeys,
    (stored) => Array.isArray(stored) && stored.length === 7 && stored.every((entry) => typeof entry === "string" && entry.length > 0)
      ? stored
      : null,
  );
  const lastAngleRef = useRef<number | null>(null);
  const lastRadiusRef = useRef<number | null>(null);
  const characterPointerRef = useRef<number | null>(null);
  const activePageRef = useRef(0);
  const selectedIndexRef = useRef(0);
  const lastShiftTapRef = useRef(0);
  const customHoldTimerRef = useRef<number | null>(null);
  const customCommitTimerRef = useRef<number | null>(null);
  const customHoldTriggeredRef = useRef(false);
  const pendingCustomRef = useRef<{ button: number; characters: string[]; characterIndex: number; position: number } | null>(null);
  const dwellTimerRef = useRef<number | null>(null);
  const dwellTargetRef = useRef("");
  const pendingCursorRef = useRef<number | null>(null);
  const vibrationStartedRef = useRef(false);
  const pages = getCharacterPages(dialSize);
  const safePage = Math.min(page, pages.length - 1);
  const characters = pages[safePage];
  const selectedCharacter = characters[selectedIndex] ?? characters[0] ?? "";
  const shifted = shiftMode !== "off";
  const displayedCharacter = shiftCharacter(selectedCharacter, shifted);

  useLayoutEffect(() => {
    const position = pendingCursorRef.current;
    if (position === null) return;
    pendingCursorRef.current = null;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.setSelectionRange(position, position);
  }, [textareaRef, value]);

  useEffect(() => () => {
    if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
    if (customCommitTimerRef.current !== null) window.clearTimeout(customCommitTimerRef.current);
    if (dwellTimerRef.current !== null) window.clearTimeout(dwellTimerRef.current);
  }, []);

  function restoreCursor(position: number, afterValueChange = true) {
    if (afterValueChange) {
      pendingCursorRef.current = position;
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.setSelectionRange(position, position);
  }

  function replaceSelection(text: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    onValueChange(`${value.slice(0, start)}${text}${value.slice(end)}`);
    restoreCursor(start + text.length);
    vibrateInput();
  }

  function vibrateInput() {
    if (!vibrationStartedRef.current) {
      vibrationStartedRef.current = true;
      return;
    }
    navigator.vibrate?.(18);
  }

  function backspace() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    if (start !== end) {
      onValueChange(`${value.slice(0, start)}${value.slice(end)}`);
      restoreCursor(start);
    } else if (start > 0) {
      const previous = Array.from(value.slice(0, start));
      previous.pop();
      const prefix = previous.join("");
      onValueChange(`${prefix}${value.slice(start)}`);
      restoreCursor(prefix.length);
    }
  }

  function updateCharacter(event: PointerEvent<HTMLDivElement>) {
    if (characterPointerRef.current !== event.pointerId) return;
    const { angle, radius } = pointerPosition(event.currentTarget, event.clientX, event.clientY);
    const previousAngle = lastAngleRef.current;
    const previousRadius = lastRadiusRef.current;
    if (previousAngle !== null && previousRadius !== null && previousRadius >= 0.66 && radius >= 0.66) {
      if (previousAngle > 300 && angle < 60) {
        activePageRef.current = (activePageRef.current + 1) % pages.length;
        setPage(activePageRef.current);
      }
      if (previousAngle < 60 && angle > 300) {
        activePageRef.current = (activePageRef.current - 1 + pages.length) % pages.length;
        setPage(activePageRef.current);
      }
    }
    lastAngleRef.current = angle;
    lastRadiusRef.current = radius;
    selectedIndexRef.current = angleIndex(angle, characters.length);
    setSelectedIndex(selectedIndexRef.current);
    scheduleDwell(activePageRef.current, selectedIndexRef.current);
  }

  function beginCharacterDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    characterPointerRef.current = event.pointerId;
    lastAngleRef.current = null;
    lastRadiusRef.current = null;
    updateCharacter(event);
  }

  function finishCharacterDrag(event: PointerEvent<HTMLDivElement>) {
    if (characterPointerRef.current !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    characterPointerRef.current = null;
    lastAngleRef.current = null;
    lastRadiusRef.current = null;
    clearDwell();
    if (dwellMode !== "off") return;
    const character = shiftCharacter(pages[activePageRef.current]?.[selectedIndexRef.current] ?? "", shifted);
    if (character) {
      replaceSelection(character);
      if (shiftMode === "once" && /^\p{L}$/u.test(pages[activePageRef.current]?.[selectedIndexRef.current] ?? "")) {
        setShiftMode("off");
      }
    }
  }

  function selectPage(event: PointerEvent<HTMLDivElement>) {
    if (characterPointerRef.current !== null) return;
    const { angle } = pointerPosition(event.currentTarget, event.clientX, event.clientY);
    activePageRef.current = angleIndex(angle, pages.length);
    setPage(activePageRef.current);
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

  function clearCustomHold() {
    if (customHoldTimerRef.current !== null) window.clearTimeout(customHoldTimerRef.current);
    customHoldTimerRef.current = null;
  }

  function commitCustomKey() {
    pendingCustomRef.current = null;
    if (customCommitTimerRef.current !== null) window.clearTimeout(customCommitTimerRef.current);
    customCommitTimerRef.current = null;
  }

  function scheduleCustomCommit() {
    if (customCommitTimerRef.current !== null) window.clearTimeout(customCommitTimerRef.current);
    customCommitTimerRef.current = window.setTimeout(() => {
      pendingCustomRef.current = null;
      customCommitTimerRef.current = null;
    }, 850);
  }

  function beginCustomKey(event: PointerEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    clearCustomHold();
    customHoldTriggeredRef.current = false;
    customHoldTimerRef.current = window.setTimeout(() => {
      customHoldTimerRef.current = null;
      const textarea = textareaRef.current;
      if (!textarea || textarea.selectionStart === textarea.selectionEnd) return;
      const selection = value.slice(textarea.selectionStart, textarea.selectionEnd);
      if (!selection) return;
      customHoldTriggeredRef.current = true;
      commitCustomKey();
      setCustomKeys((current) => current.map((characters, currentIndex) => currentIndex === index ? selection : characters));
      restoreCursor(textarea.selectionEnd, false);
    }, 500);
  }

  function pressCustomKey(index: number) {
    const characterList = Array.from(customKeys[index] ?? "");
    if (characterList.length === 0) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const pending = pendingCustomRef.current;
    const previousCharacter = pending?.characters[pending.characterIndex];
    if (pending?.button === index && previousCharacter && start === pending.position + previousCharacter.length && end === start) {
      const characterIndex = (pending.characterIndex + 1) % pending.characters.length;
      const character = pending.characters[characterIndex];
      onValueChange(`${value.slice(0, pending.position)}${character}${value.slice(pending.position + previousCharacter.length)}`);
      pendingCustomRef.current = { ...pending, characterIndex };
      restoreCursor(pending.position + character.length);
      vibrateInput();
      scheduleCustomCommit();
      return;
    }
    commitCustomKey();
    const character = characterList[0];
    onValueChange(`${value.slice(0, start)}${character}${value.slice(end)}`);
    pendingCustomRef.current = { button: index, characters: characterList, characterIndex: 0, position: start };
    restoreCursor(start + character.length);
    vibrateInput();
    scheduleCustomCommit();
  }

  function finishCustomKey(event: PointerEvent<HTMLButtonElement>, index: number) {
    clearCustomHold();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const held = customHoldTriggeredRef.current;
    customHoldTriggeredRef.current = false;
    if (!held) pressCustomKey(index);
  }

  function cycleDialSize() {
    setDialSize((current) => current === "small" ? "compact" : current === "compact" ? "large" : "small");
    activePageRef.current = 0;
    selectedIndexRef.current = 0;
    setPage(0);
    setSelectedIndex(0);
  }

  function clearDwell() {
    if (dwellTimerRef.current !== null) window.clearTimeout(dwellTimerRef.current);
    dwellTimerRef.current = null;
    dwellTargetRef.current = "";
  }

  function scheduleDwell(targetPage: number, targetIndex: number) {
    if (dwellMode === "off") return;
    const target = `${targetPage}:${targetIndex}`;
    if (dwellTargetRef.current === target) return;
    clearDwell();
    dwellTargetRef.current = target;
    dwellTimerRef.current = window.setTimeout(() => {
      dwellTimerRef.current = null;
      const sourceCharacter = pages[targetPage]?.[targetIndex] ?? "";
      if (!sourceCharacter || dwellTargetRef.current !== target) return;
      replaceSelection(shiftCharacter(sourceCharacter, shifted));
      if (shiftMode === "once" && /^\p{L}$/u.test(sourceCharacter)) setShiftMode("off");
    }, Number(dwellMode) * 1000);
  }

  function cycleDwellMode() {
    clearDwell();
    setDwellMode((current) => current === "off" ? "0.2" : current === "0.2" ? "0.3" : current === "0.3" ? "0.4" : "off");
  }

  function insertTime() {
    const now = new Date();
    const pad = (part: number) => String(part).padStart(2, "0");
    replaceSelection(`${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${pad(now.getFullYear() % 100)} ${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }

  function renderActionButton(action: CharacterDialCornerAction, className: string, ariaLabel: string) {
    if (action === "SPACE") {
      return <button type="button" className={className} onClick={() => replaceSelection(" ")}>SPACE</button>;
    }
    if (action === "DIALERSIZE") {
      return (
        <button type="button" className={className} onClick={cycleDialSize} aria-label="Change character dial size">
          {dialSize === "small" ? "S" : dialSize === "compact" ? "M" : "L"}
        </button>
      );
    }
    if (action === "TIME") {
      return <button type="button" className={className} onClick={insertTime}>TIME</button>;
    }
    if (action === "DWELL") {
      return <button type="button" className={`${className} ${dwellMode === "off" ? "" : "active"}`.trim()} onClick={cycleDwellMode} aria-label={`Dwell mode ${dwellMode}`}>{dwellMode === "off" ? "OFF" : dwellMode}</button>;
    }
    return <button type="button" className={className} aria-label={ariaLabel} />;
  }

  function renderCorner(position: "nw" | "ne" | "sw" | "se") {
    const action = corners[position];
    const positionClass = position === "nw" ? "top-left" : position === "ne" ? "top-right" : position === "sw" ? "bottom-left" : "bottom-right";
    return renderActionButton(action, `${action === "DIALERSIZE" ? "dial-size" : action === "SPACE" ? "space" : "dial-action"} ${positionClass}`, `Unassigned character dial ${position} corner`);
  }

  return (
    <div className={`character-dial-stage size-${dialSize}`} aria-label="Character dial keyboard">
      <div className="character-dial-side-controls character-dial-custom-controls" aria-label="Character dial controls">
        {customKeys.map((characters, index) => (
          <button
            key={index}
            type="button"
            className={`${index === 3 ? "small-hidden" : ""} ${index === 5 ? "large-only" : ""}`.trim()}
            onPointerDown={(event) => beginCustomKey(event, index)}
            onPointerUp={(event) => finishCustomKey(event, index)}
            onPointerCancel={() => {
              clearCustomHold();
              customHoldTriggeredRef.current = false;
            }}
            onLostPointerCapture={clearCustomHold}
            onClick={(event) => {
              if (event.detail === 0) pressCustomKey(index);
            }}
            aria-label={`Custom characters ${characters}`}
            title="Long press to use the selected text"
          >{characters}</button>
        ))}
      </div>

      <div className="character-dial-field">
        <div className="character-dial-corner-controls">
          {renderCorner("nw")}
          {renderCorner("ne")}
          {renderCorner("sw")}
          {renderCorner("se")}
        </div>

        <div className="character-dial">
        {characters.map((character, index) => (
          <RadialMark
            key={`${safePage}-${character}-${index}`}
            className={`character-dial-mark ${index === selectedIndex ? "selected" : ""}`}
            angle={(index + 0.5) / characters.length * 360}
            radius={{ percent: 42 }}
          >
            {shiftCharacter(character, shifted)}
          </RadialMark>
        ))}
        <div
          className="character-dial-touch"
          onPointerDown={beginCharacterDrag}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) updateCharacter(event);
          }}
          onPointerUp={finishCharacterDrag}
          onPointerCancel={(event) => {
            if (characterPointerRef.current !== event.pointerId) return;
            characterPointerRef.current = null;
            lastAngleRef.current = null;
            lastRadiusRef.current = null;
            clearDwell();
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={(event) => {
            if (characterPointerRef.current !== event.pointerId) return;
            characterPointerRef.current = null;
            lastAngleRef.current = null;
            lastRadiusRef.current = null;
            clearDwell();
          }}
        />

        {pages.map((_characters, index) => (
          <RadialMark
            key={index}
            className={`character-page-mark ${index === safePage ? "selected" : ""}`}
            angle={(index + 0.5) / pages.length * 360}
            radius={{ percent: 18 }}
          >
            {index + 1}
          </RadialMark>
        ))}
        <div
          className="character-page-touch"
          onPointerDown={(event) => {
            if (characterPointerRef.current !== null) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            selectPage(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) selectPage(event);
          }}
        />

        <button
          type="button"
          className={`character-dial-center ${shifted ? "active" : ""} ${shiftMode === "locked" ? "locked" : ""}`.trim()}
          onClick={toggleShift}
          aria-label={shifted ? "Use lowercase letters" : "Use uppercase letters"}
          aria-pressed={shifted}
        >
          <strong>{displayedCharacter === " " ? "␠" : displayedCharacter}</strong>
          <span>{shiftMode === "locked" ? "⇧⇧" : "⇧"} {safePage + 1}/{pages.length}</span>
        </button>
        </div>
      </div>

      <div className="character-dial-side-controls character-dial-right-controls" aria-label="Character editing controls">
        <button type="button" onClick={backspace} aria-label="Backspace">⌫</button>
        {rightButtons.slice(0, 5).map((action, index) =>
          <span key={index} className={`${index === 3 ? "small-hidden" : ""} ${index === 4 ? "large-only" : ""}`.trim()}>
            {renderActionButton(action, "right-action", `Unassigned character editing control ${index + 1}`)}
          </span>)}
        <button type="button" onClick={() => replaceSelection("\n")} aria-label="Enter">↵</button>
      </div>
    </div>
  );
}

function shiftCharacter(character: string, shifted: boolean) {
  return shifted ? character.toLocaleUpperCase("de") : character;
}
