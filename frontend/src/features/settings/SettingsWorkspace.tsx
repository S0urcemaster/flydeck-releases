import type { RefObject } from "react";
import { Editor, type EditorDictate } from "../../components/Editor";
import type { CharacterDialCornerAction, CharacterDialCorners, DwellMode } from "../../components/CharacterDial";
import type { MediKeyboardAction } from "../../components/MediKeyboard";

type SettingsWorkspaceProps = {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSelectWord: () => void;
  onMoveCursor: (direction: -1 | 1) => void;
  onDictate: EditorDictate;
  dictating: boolean;
  onSave: () => void;
  characterDialCorners: CharacterDialCorners;
  preferredKeyboard: "system" | "mobile" | "medi" | "dialer";
  dialerDefaultSize: "small" | "medium" | "large";
  characterDialRightButtons: CharacterDialCornerAction[];
  mediKeyboardActions: MediKeyboardAction[];
  dialerDefaultDwell: DwellMode;
};

export function SettingsWorkspace(props: SettingsWorkspaceProps) {
  return (
    <section className="workspace settings-workspace" aria-label="Settings">
      <section className="composer data-composer" aria-label="Local configuration">
        <Editor
          storageKey="settings"
          ref={props.textareaRef}
          ariaLabel="Local configuration"
          placeholder="ui-font-size : 50"
          spellCheck={false}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          onValueChange={props.onChange}
          onSelectWord={props.onSelectWord}
          onMoveCursor={props.onMoveCursor}
          onDictate={props.onDictate}
          dictating={props.dictating}
          onSubmit={props.onSave}
          submitDisabled={false}
          submitLabel="SAVE"
          characterDialCorners={props.characterDialCorners}
          preferredKeyboard={props.preferredKeyboard}
          dialerDefaultSize={props.dialerDefaultSize}
          characterDialRightButtons={props.characterDialRightButtons}
          mediKeyboardActions={props.mediKeyboardActions}
          dialerDefaultDwell={props.dialerDefaultDwell}
        />
      </section>
    </section>
  );
}
