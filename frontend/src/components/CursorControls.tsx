import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SafeButton } from "./SafeButton";

type CursorControlsProps = {
  onSelectWord: () => void;
  onMove: (direction: -1 | 1) => void;
  onClear: () => void;
  clearLabel?: string;
  onScrollToBottom?: () => void;
};

export function CursorControls({ onSelectWord, onMove, onClear, clearLabel, onScrollToBottom }: CursorControlsProps) {
  const [clearArmed, setClearArmed] = useState(false);
  const keepEditorFocus = (event: React.PointerEvent<HTMLButtonElement>) => event.preventDefault();

  useEffect(() => {
    if (!clearArmed) return;
    const timeout = window.setTimeout(() => setClearArmed(false), 1_000);
    return () => window.clearTimeout(timeout);
  }, [clearArmed]);

  function confirmClear() {
    setClearArmed(false);
    onClear();
  }

  return (
    <div className="cursor-row">
      {onScrollToBottom ? (
        <button type="button" onPointerDown={keepEditorFocus} onClick={onScrollToBottom} aria-label="Scroll to bottom" title="Scroll to bottom">
          <span className="button-symbol scroll-bottom-symbol">⊻</span>
        </button>
      ) : <SafeButton
        armed={clearArmed}
        label="clear"
        onPointerDown={keepEditorFocus}
        onArm={() => setClearArmed(true)}
        onConfirm={confirmClear}
      ><span className="button-symbol">✕</span>{clearLabel ?? "CLEA"}</SafeButton>}
      <button onPointerDown={keepEditorFocus} onClick={() => onMove(-1)} aria-label="Move cursor left">
        <ChevronLeft size={24} />
      </button>
      <button onPointerDown={keepEditorFocus} onClick={() => onMove(1)} aria-label="Move cursor right">
        <ChevronRight size={24} />
      </button>
      <button onPointerDown={keepEditorFocus} onClick={() => { setClearArmed(false); onSelectWord(); }} aria-label="Select word"><span className="word-selection-symbol">W</span></button>
    </div>
  );
}
