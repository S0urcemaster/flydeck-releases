import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "../../../components/Button";
import styles from "./NumberInput.module.css";

export type NumberInputProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  repeatDelay?: number;
  repeatInterval?: number;
  onChange: (value: number) => void;
};

export function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  repeatDelay = 350,
  repeatInterval = 80,
  onChange,
}: NumberInputProps) {
  const repeatDelayTimer = useRef<number | undefined>(undefined);
  const repeatIntervalTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    window.clearTimeout(repeatDelayTimer.current);
    window.clearInterval(repeatIntervalTimer.current);
  }, []);

  function update(nextValue: number) {
    if (Number.isFinite(nextValue)) {
      onChange(clampNumber(nextValue, min, max));
    }
  }

  function startRepeat(
    direction: -1 | 1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    stopRepeat();
    event.currentTarget.setPointerCapture(event.pointerId);

    let nextValue = value;
    const advance = () => {
      nextValue = clampNumber(nextValue + (direction * step), min, max);
      onChange(nextValue);
    };

    advance();
    repeatDelayTimer.current = window.setTimeout(() => {
      repeatIntervalTimer.current = window.setInterval(advance, repeatInterval);
    }, repeatDelay);
  }

  function stopRepeat() {
    window.clearTimeout(repeatDelayTimer.current);
    window.clearInterval(repeatIntervalTimer.current);
    repeatDelayTimer.current = undefined;
    repeatIntervalTimer.current = undefined;
  }

  return (
    <span className={styles.root}>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => update(event.target.valueAsNumber)}
      />
      <span className={styles.stepButtons}>
        <Button
          type="button"
          border="0"
          aria-label={`${label} increase`}
          onClick={(event) => event.detail === 0 && update(value + step)}
          onPointerDown={(event) => startRepeat(1, event)}
          onPointerUp={stopRepeat}
          onPointerCancel={stopRepeat}
          onLostPointerCapture={stopRepeat}
        >
          ▲
        </Button>
        <Button
          type="button"
          border="0"
          aria-label={`${label} decrease`}
          onClick={(event) => event.detail === 0 && update(value - step)}
          onPointerDown={(event) => startRepeat(-1, event)}
          onPointerUp={stopRepeat}
          onPointerCancel={stopRepeat}
          onLostPointerCapture={stopRepeat}
        >
          ▼
        </Button>
      </span>
    </span>
  );
}

export function clampNumber(value: number, min?: number, max?: number): number {
  const lowerBound = min ?? Number.NEGATIVE_INFINITY;
  const upperBound = max ?? Number.POSITIVE_INFINITY;
  return Math.min(upperBound, Math.max(lowerBound, value));
}
