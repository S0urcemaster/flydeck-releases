import type { RefObject } from "react";
import { Editor } from "../../components/Editor";
import type { CharacterDialCornerAction, CharacterDialCorners, DwellMode } from "../../components/CharacterDial";

type SettingsWorkspaceProps = {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSelectWord: () => void;
  onMoveCursor: (direction: -1 | 1) => void;
  onDictate: () => void;
  dictating: boolean;
  onSave: () => void;
  characterDialCorners: CharacterDialCorners;
  preferredKeyboard: "system" | "mobile" | "dialer";
  dialerDefaultSize: "small" | "medium" | "large";
  characterDialRightButtons: CharacterDialCornerAction[];
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
          onClear={() => props.onChange("")}
          onDictate={props.onDictate}
          dictating={props.dictating}
          onSubmit={props.onSave}
          submitDisabled={false}
          submitLabel="SAVE"
          characterDialCorners={props.characterDialCorners}
          preferredKeyboard={props.preferredKeyboard}
          dialerDefaultSize={props.dialerDefaultSize}
          characterDialRightButtons={props.characterDialRightButtons}
          dialerDefaultDwell={props.dialerDefaultDwell}
        />
      </section>
    </section>
  );
}
