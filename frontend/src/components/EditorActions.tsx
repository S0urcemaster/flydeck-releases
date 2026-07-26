import { useRef, type PointerEvent } from "react";
import { Mic, Send } from "lucide-react";

type EditorActionsProps = {
  onDictate: () => void;
  dictating: boolean;
  dictateDisabled?: boolean;
  onSubmit: () => void;
  onSubmitLongPress?: () => void;
  submitDisabled: boolean;
  submitLabel?: string;
  submitSecondaryLabel?: string;
};

export function EditorActions(props: EditorActionsProps) {
  const submitHoldTimerRef = useRef<number | null>(null);
  const suppressSubmitClickRef = useRef(false);

  function clearSubmitHold() {
    if (submitHoldTimerRef.current !== null) window.clearTimeout(submitHoldTimerRef.current);
    submitHoldTimerRef.current = null;
  }

  function beginSubmitHold(event: PointerEvent<HTMLButtonElement>) {
    if (!props.onSubmitLongPress || props.submitDisabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressSubmitClickRef.current = false;
    clearSubmitHold();
    submitHoldTimerRef.current = window.setTimeout(() => {
      submitHoldTimerRef.current = null;
      suppressSubmitClickRef.current = true;
      props.onSubmitLongPress?.();
    }, 500);
  }

  return (
    <div className="action-row">
      <button className={`dictate ${props.dictating ? "active" : ""}`} onClick={props.onDictate} disabled={props.dictateDisabled}><Mic size={22} />MIC</button>
      <button
        className="primary"
        onPointerDown={beginSubmitHold}
        onPointerUp={clearSubmitHold}
        onPointerCancel={clearSubmitHold}
        onLostPointerCapture={clearSubmitHold}
        onClick={() => {
          if (suppressSubmitClickRef.current) {
            suppressSubmitClickRef.current = false;
            return;
          }
          props.onSubmit();
        }}
        disabled={props.submitDisabled}
      >
        <Send size={22} />
        <span>{props.submitLabel ?? "SEND"}{props.submitSecondaryLabel && <sub>{props.submitSecondaryLabel}</sub>}</span>
      </button>
    </div>
  );
}
