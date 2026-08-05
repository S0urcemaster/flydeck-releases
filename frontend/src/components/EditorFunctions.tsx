import { Keyboard, Repeat2 } from "lucide-react";
import type { EditorTextSize } from "./Editor";

type EditorFunctionsProps = {
  textSize: EditorTextSize;
  onCycleTextSize: () => void;
  keyboardEnabled: boolean;
  onToggleKeyboard: () => void;
  phoneKeyboardEnabled: boolean;
  onTogglePhoneKeyboard: () => void;
  mediKeyboardEnabled: boolean;
  onToggleMediKeyboard: () => void;
  characterDialEnabled: boolean;
  onToggleCharacterDial: () => void;
  keyboardDisabled?: boolean;
};

export function EditorFunctions({ textSize, onCycleTextSize, keyboardEnabled, onToggleKeyboard, phoneKeyboardEnabled, onTogglePhoneKeyboard, mediKeyboardEnabled, onToggleMediKeyboard, characterDialEnabled, onToggleCharacterDial, keyboardDisabled }: EditorFunctionsProps) {
  return (
    <div className="editor-function-row" aria-label="Editor functions">
      <button
        className={keyboardEnabled ? "active" : ""}
        onClick={onToggleKeyboard}
        disabled={keyboardDisabled}
        aria-label={keyboardEnabled ? "Hide keyboard" : "Show keyboard"}
        title={keyboardEnabled ? "Hide keyboard" : "Show keyboard"}
      ><span className="smartphone-keyboard-symbol">⌨</span></button>
      <button className={phoneKeyboardEnabled ? "active" : ""} onClick={onTogglePhoneKeyboard} disabled={keyboardDisabled} aria-label="Toggle multi-tap keyboard" title="Multi-tap keyboard"><Keyboard size={35} /></button>
      <button className={mediKeyboardEnabled ? "active" : ""} onClick={onToggleMediKeyboard} disabled={keyboardDisabled} aria-label="Toggle MediKeyboard" title="MediKeyboard"><span className="medi-keyboard-symbol">MEDI</span></button>
      <button className={characterDialEnabled ? "active" : ""} onClick={onToggleCharacterDial} disabled={keyboardDisabled} aria-label="Toggle character dial" title="Character dial"><span className="character-dial-symbol">𖣦</span></button>
      <button onClick={onCycleTextSize} aria-label={`Editor text size: ${textSize}`} title="Editor text size">
        <Repeat2 size={16} />{textSize}
      </button>
    </div>
  );
}
