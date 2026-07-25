import { Mic, Send } from "lucide-react";

type EditorActionsProps = {
  onDictate: () => void;
  dictating: boolean;
  dictateDisabled?: boolean;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel?: string;
};

export function EditorActions(props: EditorActionsProps) {
  return (
    <div className="action-row">
      <button className={`dictate ${props.dictating ? "active" : ""}`} onClick={props.onDictate} disabled={props.dictateDisabled}><Mic size={22} />MIC</button>
      <button className="primary" onClick={props.onSubmit} disabled={props.submitDisabled}>
        <Send size={22} />{props.submitLabel ?? "SEND"}
      </button>
    </div>
  );
}
