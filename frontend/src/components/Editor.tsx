import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ChangeEventHandler, type KeyboardEventHandler, type ReactNode, type RefObject, type UIEventHandler } from "react";
import { createPortal } from "react-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { EditorActions } from "./EditorActions";
import { EditorFunctions } from "./EditorFunctions";
import { CursorControls } from "./CursorControls";
import { PhoneKeyboard } from "./PhoneKeyboard";
import { CharacterDial } from "./CharacterDial";
import type { CharacterDialCornerAction, CharacterDialCorners, DwellMode } from "./CharacterDial";

export type EditorTextSize = "SMAL" | "MEDI" | "BIG";
type CustomKeyboardMode = "mobile" | "dialer";

export function getPreferredCustomKeyboard(
  preferredKeyboard: "system" | "mobile" | "dialer",
): CustomKeyboardMode {
  return preferredKeyboard === "mobile" ? "mobile" : "dialer";
}

type EditorProps = {
  storageKey: string;
  ariaLabel: string;
  placeholder: string;
  value: string;
  className?: string;
  readOnly?: boolean;
  hint?: ReactNode;
  onScroll?: UIEventHandler<HTMLTextAreaElement>;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onValueChange: (value: string) => void;
  onSelectWord: () => void;
  onMoveCursor: (direction: -1 | 1) => void;
  onScrollToBottom?: () => void;
  onDictate: () => void;
  dictating: boolean;
  dictateDisabled?: boolean;
  onSubmit: () => void;
  onSubmitLongPress?: () => void;
  submitDisabled: boolean;
  submitLabel?: string;
  submitSecondaryLabel?: string;
  characterDialCorners?: CharacterDialCorners;
  preferredKeyboard?: "system" | "mobile" | "dialer";
  dialerDefaultSize?: "small" | "medium" | "large";
  spellCheck?: boolean;
  characterDialRightButtons?: CharacterDialCornerAction[];
  dialerDefaultDwell?: DwellMode;
  temporaryInput?: {
    ref: RefObject<HTMLInputElement | null>;
    keyboardHostRef: RefObject<HTMLDivElement | null>;
    value: string;
    onValueChange: (value: string) => void;
    onSubmit: () => void;
    submitDisabled: boolean;
    submitLabel?: string;
  } | null;
  onDismissTemporaryInput?: () => void;
  hideTextarea?: boolean;
};

export const Editor = forwardRef<HTMLTextAreaElement, EditorProps>(function Editor({
  storageKey,
  ariaLabel,
  placeholder,
  value,
  className,
  readOnly,
  hint,
  onScroll,
  onKeyDown,
  onChange,
  onValueChange,
  onSelectWord,
  onMoveCursor,
  onScrollToBottom,
  onDictate,
  dictating,
  dictateDisabled,
  onSubmit,
  onSubmitLongPress,
  submitDisabled,
  submitLabel,
  submitSecondaryLabel,
  characterDialCorners,
  preferredKeyboard = "dialer",
  dialerDefaultSize = "small",
  spellCheck,
  characterDialRightButtons,
  dialerDefaultDwell = "0.3",
  temporaryInput,
  onDismissTemporaryInput,
  hideTextarea = false,
}, textareaRef) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardClosedViewportHeightRef = useRef(0);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const [phoneKeyboardEnabled, setPhoneKeyboardEnabled] = useState(false);
  const [characterDialEnabled, setCharacterDialEnabled] = useState(true);
  const [temporaryKeyboardMode, setTemporaryKeyboardMode] = useState<CustomKeyboardMode>(
    () => getPreferredCustomKeyboard(preferredKeyboard),
  );
  const [textSize, setTextSize] = useLocalStorage<EditorTextSize>(`flydeck.editorTextSize.${storageKey}`, "SMAL", (value) =>
    value === "SMAL" || value === "MEDI" || value === "BIG" ? value : null,
  );
  useImperativeHandle(textareaRef, () => internalTextareaRef.current as HTMLTextAreaElement);
  const activeInputRef = (temporaryInput?.ref ?? internalTextareaRef) as RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  const activeValue = temporaryInput?.value ?? value;
  const setActiveValue = temporaryInput?.onValueChange ?? onValueChange;
  const activePhoneKeyboard = temporaryInput ? temporaryKeyboardMode === "mobile" : phoneKeyboardEnabled;
  const activeCharacterDial = temporaryInput ? temporaryKeyboardMode === "dialer" : characterDialEnabled;

  function moveActiveCursor(direction: -1 | 1) {
    if (!temporaryInput) {
      onMoveCursor(direction);
      return;
    }
    const input = temporaryInput.ref.current;
    if (!input) return;
    const position = input.selectionStart ?? input.value.length;
    const nextPosition = Math.max(0, Math.min(input.value.length, position + direction));
    input.focus({ preventScroll: true });
    input.setSelectionRange(nextPosition, nextPosition);
  }

  function selectActiveWord() {
    if (!temporaryInput) {
      onSelectWord();
      return;
    }
    const input = temporaryInput.ref.current;
    if (!input) return;
    const position = input.selectionStart ?? 0;
    const words = Array.from(input.value.matchAll(/\S+/g));
    const word = words.find((entry) => {
      const start = entry.index ?? 0;
      return position >= start && position <= start + entry[0].length;
    }) ?? words[0];
    if (!word) return;
    const start = word.index ?? 0;
    input.focus({ preventScroll: true });
    input.setSelectionRange(start, start + word[0].length);
  }

  function copyActiveSelection() {
    const input = activeInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start === end) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(start, end);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(input.value.slice(start, end)).catch(() => undefined);
    } else {
      document.execCommand("copy");
    }
  }

  async function pasteIntoActiveSelection() {
    const input = activeInputRef.current;
    if (!input || !navigator.clipboard?.readText) return;
    const pastedText = await navigator.clipboard.readText().catch(() => null);
    if (pastedText === null) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${input.value.slice(0, start)}${pastedText}${input.value.slice(end)}`;
    setActiveValue(nextValue);
    requestAnimationFrame(() => {
      const nextPosition = start + pastedText.length;
      input.focus({ preventScroll: true });
      input.setSelectionRange(nextPosition, nextPosition);
    });
  }

  function selectAllActiveText() {
    const input = activeInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(0, input.value.length);
  }

  useEffect(() => {
    if (!keyboardEnabled || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      if (viewport.height >= keyboardClosedViewportHeightRef.current - 40) setKeyboardEnabled(false);
    };
    viewport.addEventListener("resize", handleViewportResize);
    return () => viewport.removeEventListener("resize", handleViewportResize);
  }, [keyboardEnabled]);

  function toggleKeyboard() {
    const nextEnabled = !keyboardEnabled;
    if (nextEnabled) setPhoneKeyboardEnabled(false);
    if (nextEnabled) setCharacterDialEnabled(false);
    if (nextEnabled) keyboardClosedViewportHeightRef.current = window.visualViewport?.height ?? window.innerHeight;
    setKeyboardEnabled(nextEnabled);
    const textarea = internalTextareaRef.current;
    if (!textarea) return;
    textarea.setAttribute("inputmode", nextEnabled ? "text" : "none");
    if (nextEnabled) textarea.focus({ preventScroll: true });
    else textarea.blur();
  }

  const keyboardBlock = (
    <div
      className={`editor-keyboard-block ${
        temporaryInput ? "input-keyboard-block" : "textarea-keyboard-block"
      }`}
      onPointerDown={temporaryInput ? (event) => event.preventDefault() : undefined}
    >
      <CursorControls
        onSelectWord={selectActiveWord}
        onMove={moveActiveCursor}
        onCopy={copyActiveSelection}
        onPaste={() => void pasteIntoActiveSelection()}
        onSelectAll={selectAllActiveText}
        onScrollToBottom={temporaryInput ? undefined : onScrollToBottom}
      />
      <EditorFunctions
        textSize={textSize}
        onCycleTextSize={() => setTextSize((current) => current === "SMAL" ? "MEDI" : current === "MEDI" ? "BIG" : "SMAL")}
        keyboardEnabled={keyboardEnabled}
        onToggleKeyboard={toggleKeyboard}
        keyboardDisabled={readOnly}
        phoneKeyboardEnabled={activePhoneKeyboard}
        onTogglePhoneKeyboard={() => {
          if (temporaryInput) {
            setTemporaryKeyboardMode("mobile");
            return;
          }
          setPhoneKeyboardEnabled((current) => {
            if (current) return true;
            setKeyboardEnabled(false);
            setCharacterDialEnabled(false);
            internalTextareaRef.current?.blur();
            return true;
          });
        }}
        characterDialEnabled={activeCharacterDial}
        onToggleCharacterDial={() => {
          if (temporaryInput) {
            setTemporaryKeyboardMode("dialer");
            return;
          }
          setCharacterDialEnabled((current) => {
            if (current) return true;
            setKeyboardEnabled(false);
            setPhoneKeyboardEnabled(false);
            internalTextareaRef.current?.blur();
            return true;
          });
        }}
      />
      <div
        className={`keyboard-switcher ${
          activePhoneKeyboard ? "show-phone" : activeCharacterDial ? "show-dial" : "keyboard-hidden"
        }`}
      >
        <div className="keyboard-panel phone-keyboard-panel" aria-hidden={!activePhoneKeyboard} inert={!activePhoneKeyboard}>
          <PhoneKeyboard
            key={temporaryInput ? "temporary-phone" : "textarea-phone"}
            textareaRef={activeInputRef}
            value={activeValue}
            onValueChange={setActiveValue}
            onEnter={temporaryInput ? () => {
              if (!temporaryInput.submitDisabled) temporaryInput.onSubmit();
            } : undefined}
          />
        </div>
        <div className="keyboard-panel dial-keyboard-panel" aria-hidden={!activeCharacterDial} inert={!activeCharacterDial}>
          <CharacterDial
            key={temporaryInput ? "temporary-dial" : "textarea-dial"}
            textareaRef={activeInputRef}
            value={activeValue}
            onValueChange={setActiveValue}
            corners={characterDialCorners}
            defaultSize={temporaryInput ? "small" : dialerDefaultSize}
            rightButtons={characterDialRightButtons}
            defaultDwell={dialerDefaultDwell}
            onEnter={temporaryInput ? () => {
              if (!temporaryInput.submitDisabled) temporaryInput.onSubmit();
            } : undefined}
          />
        </div>
      </div>
      <div>
        <EditorActions
          onDictate={onDictate}
          dictating={dictating}
          dictateDisabled={Boolean(temporaryInput) || dictateDisabled}
          onSubmit={temporaryInput?.onSubmit ?? onSubmit}
          onSubmitLongPress={temporaryInput ? undefined : onSubmitLongPress}
          submitDisabled={temporaryInput?.submitDisabled ?? submitDisabled}
          submitLabel={temporaryInput?.submitLabel ?? submitLabel}
          submitSecondaryLabel={temporaryInput ? undefined : submitSecondaryLabel}
        />
      </div>
    </div>
  );

  return (
    <>
      {!hideTextarea && <div className="textarea-shell">
        {hint}
        <textarea
          ref={internalTextareaRef}
          inputMode={keyboardEnabled ? "text" : "none"}
          className={`${className ?? ""} editor-size-${textSize.toLowerCase()}`.trim()}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={spellCheck ?? false}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onFocus={onDismissTemporaryInput}
          onClick={() => {
            if (readOnly || keyboardEnabled || phoneKeyboardEnabled || characterDialEnabled) return;
            if (preferredKeyboard === "mobile") {
              setPhoneKeyboardEnabled(true);
              return;
            }
            if (preferredKeyboard === "dialer") {
              setCharacterDialEnabled(true);
              return;
            }
            keyboardClosedViewportHeightRef.current = window.visualViewport?.height ?? window.innerHeight;
            internalTextareaRef.current?.setAttribute("inputmode", "text");
            setKeyboardEnabled(true);
          }}
          onBlur={() => setKeyboardEnabled(false)}
          onChange={onChange}
        />
      </div>}
      {(!hideTextarea || temporaryInput) && (temporaryInput?.keyboardHostRef.current
        ? createPortal(keyboardBlock, temporaryInput.keyboardHostRef.current)
        : keyboardBlock)}
    </>
  );
});
