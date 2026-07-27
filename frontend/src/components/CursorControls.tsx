import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

type CursorControlsProps = {
  onSelectWord: () => void;
  onMove: (direction: -1 | 1) => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onScrollToBottom?: () => void;
};

type AlternateActionButtonProps = {
  children: ReactNode;
  ariaLabel: string;
  title: string;
  onPress: () => void;
  onLongPress: () => void;
};

const longPressDelay = 500;

function AlternateActionButton({ children, ariaLabel, title, onPress, onLongPress }: AlternateActionButtonProps) {
  const timerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  function cancelTimer() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => cancelTimer, []);

  function beginPress(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cancelTimer();
    longPressTriggeredRef.current = false;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      longPressTriggeredRef.current = true;
      onLongPress();
    }, longPressDelay);
  }

  function finishPress(event: PointerEvent<HTMLButtonElement>) {
    cancelTimer();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const wasLongPress = longPressTriggeredRef.current;
    longPressTriggeredRef.current = false;
    if (!wasLongPress) onPress();
  }

  function cancelPress() {
    cancelTimer();
    longPressTriggeredRef.current = false;
  }

  return (
    <button
      type="button"
      onPointerDown={beginPress}
      onPointerUp={finishPress}
      onPointerCancel={cancelPress}
      onClick={(event) => { if (event.detail === 0) onPress(); }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}

export function CursorControls({ onSelectWord, onMove, onCopy, onPaste, onSelectAll, onScrollToBottom }: CursorControlsProps) {
  const keepEditorFocus = (event: React.PointerEvent<HTMLButtonElement>) => event.preventDefault();

  return (
    <div className="cursor-row">
      {onScrollToBottom ? (
        <button type="button" onPointerDown={keepEditorFocus} onClick={onScrollToBottom} aria-label="Scroll to bottom" title="Scroll to bottom">
          <span className="button-symbol scroll-bottom-symbol">⊻</span>
        </button>
      ) : <button type="button" disabled aria-hidden="true" />}
      <AlternateActionButton
        ariaLabel="Move cursor left; long press to copy"
        title="Left / long press: copy selection"
        onPress={() => onMove(-1)}
        onLongPress={onCopy}
      >
        <span className="alternate-action-label"><span className="alternate-primary-symbol">◀</span><sub>COPY</sub></span>
      </AlternateActionButton>
      <AlternateActionButton
        ariaLabel="Move cursor right; long press to paste"
        title="Right / long press: paste"
        onPress={() => onMove(1)}
        onLongPress={onPaste}
      >
        <span className="alternate-action-label"><span className="alternate-primary-symbol">▶</span><sub>PAST</sub></span>
      </AlternateActionButton>
      <AlternateActionButton
        ariaLabel="Select word; long press to select all"
        title="Select word / long press: select all"
        onPress={onSelectWord}
        onLongPress={onSelectAll}
      >
        <span className="alternate-action-label"><span>W</span><sub>ALL</sub></span>
      </AlternateActionButton>
    </div>
  );
}
