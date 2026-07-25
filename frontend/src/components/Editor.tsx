import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ChangeEventHandler, type KeyboardEventHandler, type ReactNode, type UIEventHandler } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { EditorActions } from "./EditorActions";
import { EditorFunctions } from "./EditorFunctions";
import { CursorControls } from "./CursorControls";
import { PhoneKeyboard } from "./PhoneKeyboard";
import { CharacterDial } from "./CharacterDial";
import type { CharacterDialCornerAction, CharacterDialCorners, DwellMode } from "./CharacterDial";

export type EditorTextSize = "SMAL" | "MEDI" | "BIG";

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
  onClear: () => void;
  clearLabel?: string;
  onScrollToBottom?: () => void;
  onDictate: () => void;
  dictating: boolean;
  dictateDisabled?: boolean;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel?: string;
  characterDialCorners?: CharacterDialCorners;
  preferredKeyboard?: "system" | "mobile" | "dialer";
  dialerDefaultSize?: "small" | "medium" | "large";
  spellCheck?: boolean;
  characterDialRightButtons?: CharacterDialCornerAction[];
  dialerDefaultDwell?: DwellMode;
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
  onClear,
  clearLabel,
  onScrollToBottom,
  onDictate,
  dictating,
  dictateDisabled,
  onSubmit,
  submitDisabled,
  submitLabel,
  characterDialCorners,
  preferredKeyboard = "dialer",
  dialerDefaultSize = "small",
  spellCheck,
  characterDialRightButtons,
  dialerDefaultDwell = "0.3",
}, textareaRef) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editorActionsRef = useRef<HTMLDivElement>(null);
  const keyboardClosedViewportHeightRef = useRef(0);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const [phoneKeyboardEnabled, setPhoneKeyboardEnabled] = useState(false);
  const [characterDialEnabled, setCharacterDialEnabled] = useState(false);
  const [textSize, setTextSize] = useLocalStorage<EditorTextSize>(`flydeck.editorTextSize.${storageKey}`, "SMAL", (value) =>
    value === "SMAL" || value === "MEDI" || value === "BIG" ? value : null,
  );
  useImperativeHandle(textareaRef, () => internalTextareaRef.current as HTMLTextAreaElement);

  useEffect(() => {
    if (!keyboardEnabled || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      if (viewport.height >= keyboardClosedViewportHeightRef.current - 40) setKeyboardEnabled(false);
    };
    viewport.addEventListener("resize", handleViewportResize);
    return () => viewport.removeEventListener("resize", handleViewportResize);
  }, [keyboardEnabled]);

  useEffect(() => {
    if (!phoneKeyboardEnabled && !characterDialEnabled) return;
    const frame = requestAnimationFrame(() => {
      editorActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [characterDialEnabled, phoneKeyboardEnabled]);

  function toggleKeyboard() {
    const nextEnabled = !keyboardEnabled;
    if (nextEnabled) setPhoneKeyboardEnabled(false);
    if (nextEnabled) setCharacterDialEnabled(false);
    if (nextEnabled) keyboardClosedViewportHeightRef.current = window.visualViewport?.height ?? window.innerHeight;
    setKeyboardEnabled(nextEnabled);
    const textarea = internalTextareaRef.current;
    if (!textarea) return;
    textarea.setAttribute("inputmode", nextEnabled ? "text" : "none");
    if (nextEnabled) textarea.focus();
    else textarea.blur();
  }

  return (
    <>
      <div className="textarea-shell">
        {hint}
        <textarea
          ref={internalTextareaRef}
          inputMode={keyboardEnabled ? "text" : "none"}
          className={`${className ?? ""} editor-size-${textSize.toLowerCase()}`.trim()}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          spellCheck={spellCheck}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
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
      </div>
      <CursorControls onSelectWord={onSelectWord} onMove={onMoveCursor} onClear={onClear} clearLabel={clearLabel} onScrollToBottom={onScrollToBottom} />
      <EditorFunctions
        textSize={textSize}
        onCycleTextSize={() => setTextSize((current) => current === "SMAL" ? "MEDI" : current === "MEDI" ? "BIG" : "SMAL")}
        keyboardEnabled={keyboardEnabled}
        onToggleKeyboard={toggleKeyboard}
        keyboardDisabled={readOnly}
        phoneKeyboardEnabled={phoneKeyboardEnabled}
        onTogglePhoneKeyboard={() => {
          setPhoneKeyboardEnabled((current) => {
            if (current) return false;
            setKeyboardEnabled(false);
            setCharacterDialEnabled(false);
            internalTextareaRef.current?.blur();
            return true;
          });
        }}
        characterDialEnabled={characterDialEnabled}
        onToggleCharacterDial={() => {
          setCharacterDialEnabled((current) => {
            if (current) return false;
            setKeyboardEnabled(false);
            setPhoneKeyboardEnabled(false);
            internalTextareaRef.current?.blur();
            return true;
          });
        }}
      />
      {phoneKeyboardEnabled && (
        <PhoneKeyboard
          textareaRef={internalTextareaRef}
          value={value}
          onValueChange={onValueChange}
        />
      )}
      {characterDialEnabled && (
        <CharacterDial
          textareaRef={internalTextareaRef}
          value={value}
          onValueChange={onValueChange}
          corners={characterDialCorners}
          defaultSize={dialerDefaultSize}
          rightButtons={characterDialRightButtons}
          defaultDwell={dialerDefaultDwell}
        />
      )}
      <div ref={editorActionsRef}>
        <EditorActions
          onDictate={onDictate}
          dictating={dictating}
          dictateDisabled={dictateDisabled}
          onSubmit={onSubmit}
          submitDisabled={submitDisabled}
          submitLabel={submitLabel}
        />
      </div>
    </>
  );
});
