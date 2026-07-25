import { toSegmentDigits } from "./model";

export function DisplayUnit({ value, unit, length = 2 }: { value: number; unit: string; length?: number }) {
  return (
    <span className="display-unit">
      <span className="segment-digits">{toSegmentDigits(value, length)}</span>
      <span>{unit}</span>
    </span>
  );
}

export function DisplayClockTime({ hours, minutes }: { hours: number; minutes: number }) {
  return (
    <span className="display-clock-time">
      <span className="segment-digits">{toSegmentDigits(hours)}</span>
      <span>:</span>
      <span className="segment-digits">{toSegmentDigits(minutes)}</span>
    </span>
  );
}
