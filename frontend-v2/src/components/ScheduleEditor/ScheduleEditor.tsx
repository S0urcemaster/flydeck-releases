import { useEffect, useState } from "react";
import type { SchedulePlan } from "@flydeck/shared/v2";
import { ArrowRight, Clock, Minus, Plus } from "lucide-react";
import { Button, type ButtonProps } from "../Button";
import { Base, type BaseStyleProps } from "../Base";
import { DeleteButton } from "../DeleteButton";
import { DateInput, type DateInputPart } from "../DateInput";
import { Textarea, type TextareaProps } from "../Textarea";
import styles from "./ScheduleEditor.module.css";

export type ScheduleEditorProps = {
  value: SchedulePlan;
  disabled?: boolean;
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  dateInputProps?: BaseStyleProps;
  textareaProps?: Omit<TextareaProps, "aria-label" | "onChange" | "rows" | "value">;
  showActivationButton?: boolean;
  showComment?: boolean;
  showNtfyToggle?: boolean;
  showRepetitions?: boolean;
  showSaveButton?: boolean;
  timeZone?: string;
  onChange?: (value: SchedulePlan) => void;
  onSave: (value: SchedulePlan) => void | Promise<unknown>;
} & BaseStyleProps;

export function ScheduleEditor({ value, disabled, buttonProps, dateInputProps, textareaProps, showActivationButton = true, showComment = true, showNtfyToggle = false, showRepetitions = true, showSaveButton = true, timeZone = value.timeZone, onChange, onSave, ...baseProps }: ScheduleEditorProps) {
  const initialValue = normalizeScheduleComments({ ...value, timeZone });
  const [draft, setDraft] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [selectedPoint, setSelectedPoint] = useState(0);
  const [selectedDatePart, setSelectedDatePart] = useState<DateInputPart>("year");
  const [saving, setSaving] = useState(false);
  const [minimumTime] = useState(() => startOfCurrentMinute().toISOString());
  useEffect(() => { onChange?.(draft); }, [draft, onChange]);
  const update = (change: Partial<SchedulePlan>) => setDraft((current) => ({ ...current, ...change }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const mediumButtonProps = {
    ...buttonProps,
    fontSize: "inherit",
    size: "medium" as const,
  };
  const valid = Date.parse(draft.endAt) > Date.parse(draft.startAt)
    && draft.stops.every((stop, index) => Date.parse(stop) > Date.parse(draft.startAt)
      && Date.parse(stop) < Date.parse(draft.endAt)
      && (index === 0 || Date.parse(stop) > Date.parse(draft.stops[index - 1])));
  const futureValid = [draft.startAt, ...draft.stops, draft.endAt]
    .every((point) => Date.parse(point) > Date.parse(minimumTime));
  async function persist(next: SchedulePlan) {
    if (saving) return;
    setSaving(true);
    try {
      const result = await onSave(next);
      if (result !== false) {
        setDraft(next);
        setSaved(next);
      }
    } catch {
      // Keep the editor dirty so the user can retry.
    } finally {
      setSaving(false);
    }
  }
  function save() {
    const allTimesStillFuture = isScheduleCurrentOrFuture(draft);
    if (!dirty || !valid || !allTimesStillFuture || !draft.timeZone.trim()) return;
    void persist({ ...draft, enabled: saved.enabled });
  }
  function toggleActive() {
    if (dirty) return;
    const enabled = !saved.enabled;
    const allTimesStillFuture = isScheduleCurrentOrFuture(saved);
    if (enabled && (!valid || !allTimesStillFuture || !saved.timeZone.trim())) return;
    void persist({ ...saved, enabled });
  }
  return <Base {...baseProps} componentName="ScheduleEditor" className={styles.root}>
    <div className={styles.dateRow}>
      <DateField active={selectedPoint === 0} buttonProps={mediumButtonProps} dateInputProps={dateInputProps} label="[ Start" value={draft.startAt} timeZone={draft.timeZone} disabled={disabled} onPartChange={setSelectedDatePart} onSelect={() => setSelectedPoint(0)} onChange={(startAt) => setDraft((current) => normalizeDateAction(current, adjustSchedulePoint(current, 0, startAt), 0))} />
      <DateSideActions visible={selectedPoint === 0} buttonProps={mediumButtonProps} disabled={disabled} onNow={() => setDraft((current) => adjustSchedulePoint(current, 0, fiveMinutesFromNow()))} onPush={() => setDraft((current) => normalizeDateAction(current, pushSchedulePoint(current, 0, selectedDatePart, current.timeZone), 0))} />
    </div>
    <div className={styles.stops}>
      {draft.stops.map((stop, index) => <div className={styles.dateRow} key={index}>
        <DateField active={selectedPoint === index + 1} buttonProps={mediumButtonProps} dateInputProps={dateInputProps} label={`Stop ${index + 1}`} value={stop} timeZone={draft.timeZone} disabled={disabled} onPartChange={setSelectedDatePart} onSelect={() => setSelectedPoint(index + 1)} onChange={(next) => setDraft((current) => normalizeDateAction(current, adjustSchedulePoint(current, index + 1, next), index + 1))} />
        <div className={styles.dateActions}>
          {selectedPoint === index + 1 ? <><NowButton buttonProps={mediumButtonProps} disabled={disabled} onClick={() => setDraft((current) => adjustSchedulePoint(current, index + 1, fiveMinutesFromNow()))} /><PushButton buttonProps={mediumButtonProps} disabled={disabled} onClick={() => setDraft((current) => normalizeDateAction(current, pushSchedulePoint(current, index + 1, selectedDatePart, current.timeZone), index + 1))} /></> : null}
          <DeleteButton {...mediumButtonProps} className={styles.sideButton} width="2.75rem" height="2.75rem" disabled={disabled} label={`stop ${index + 1}`}
            onDelete={() => {
              const comments = draft.comments.filter((_, commentIndex) => commentIndex !== index + 1);
              update({ stops: draft.stops.filter((_, itemIndex) => itemIndex !== index), comments });
              setSelectedPoint((current) => Math.min(current > index ? current - 1 : current, comments.length - 1));
            }} />
        </div>
      </div>)}
    </div>
    <div className={styles.dateRow}>
      <DateField active={selectedPoint === draft.stops.length + 1} buttonProps={mediumButtonProps} dateInputProps={dateInputProps} label="] End" value={draft.endAt} timeZone={draft.timeZone} disabled={disabled} onPartChange={setSelectedDatePart} onSelect={() => setSelectedPoint(draft.stops.length + 1)} onChange={(endAt) => setDraft((current) => normalizeDateAction(current, adjustSchedulePoint(current, current.stops.length + 1, endAt), current.stops.length + 1))} />
      <DateSideActions visible={selectedPoint === draft.stops.length + 1} buttonProps={mediumButtonProps} disabled={disabled} onNow={() => setDraft((current) => adjustSchedulePoint(current, current.stops.length + 1, fiveMinutesFromNow()))} onPush={() => setDraft((current) => normalizeDateAction(current, pushSchedulePoint(current, current.stops.length + 1, selectedDatePart, current.timeZone), current.stops.length + 1))} />
    </div>
    <div className={styles.actions}>
      <Button {...mediumButtonProps} disabled={disabled || draft.stops.length >= 64} onClick={() => {
        const previous = draft.stops.at(-1) ?? draft.startAt;
        const next = new Date((Date.parse(previous) + Date.parse(draft.endAt)) / 2).toISOString();
        update({ stops: [...draft.stops, next], comments: [...draft.comments.slice(0, -1), "", draft.comments.at(-1) ?? ""] });
        setSelectedPoint(draft.stops.length + 1);
      }}>New stop</Button>
      {showActivationButton ? <Button {...mediumButtonProps} activeColor="COLOR_SUCCESS" selected={saved.enabled}
        disabled={disabled || saving || dirty || (!saved.enabled && (!valid || !futureValid || !saved.timeZone.trim()))}
        onClick={toggleActive}>
        {saved.enabled ? "Active" : "Inactive"}
      </Button> : null}
      {showSaveButton ? <Button {...mediumButtonProps} activeColor="COLOR_SUCCESS"
        disabled={disabled || saving || !dirty || !valid || !futureValid || !draft.timeZone.trim()}
        onClick={save}>
        Save schedule
      </Button> : null}
    </div>
    {showNtfyToggle || showRepetitions ? <div className={styles.notificationRow}>
      {showNtfyToggle ? <Button {...mediumButtonProps} selected={draft.notifyWithNtfy} disabled={disabled}
        onClick={() => update({ notifyWithNtfy: !draft.notifyWithNtfy })}>
        Notify with ntfy {draft.notifyWithNtfy ? "on" : "off"}
      </Button> : null}
      {showRepetitions ? <div className={styles.repetitions}>
        <span>Repetitions</span>
        <Button {...buttonProps} className={styles.stepButton} aria-label="Decrease repetitions"
          disabled={disabled || draft.repetitions === 0}
          onClick={() => update({ repetitions: Math.max(0, draft.repetitions - 1) })}>
          <Minus aria-hidden="true" />
        </Button>
        <output aria-label="Repetitions value">{draft.repetitions}</output>
        <Button {...buttonProps} className={styles.stepButton} aria-label="Increase repetitions"
          disabled={disabled || draft.repetitions === 10_000}
          onClick={() => update({ repetitions: Math.min(10_000, draft.repetitions + 1) })}>
          <Plus aria-hidden="true" />
        </Button>
      </div> : null}
    </div> : null}
    {showComment ? <label className={styles.comment}><span>{pointLabel(selectedPoint, draft.stops.length)} comment</span><Textarea
      {...textareaProps} aria-label="Schedule comment" rows={3} size="compact"
      value={draft.comments[selectedPoint] ?? ""} disabled={disabled}
      onChange={(event) => {
        const comments = draft.comments.map((comment, index) => index === selectedPoint ? event.currentTarget.value : comment);
        update({ comments, comment: comments[0] ?? "" });
      }} /></label> : null}
  </Base>;
}

function DateField({ active, buttonProps, dateInputProps, label, value, timeZone, disabled, onPartChange, onSelect, onChange }: { active: boolean; buttonProps?: ScheduleEditorProps["buttonProps"]; dateInputProps?: BaseStyleProps; label: string; value: string; timeZone: string; disabled?: boolean; onPartChange: (part: DateInputPart) => void; onSelect: () => void; onChange: (value: string) => void }) {
  return <DateInput {...dateInputProps} active={active} buttonProps={buttonProps} label={label} value={toZonedLocal(value, timeZone)} disabled={disabled} onPartChange={onPartChange} onSelect={onSelect} onChange={(next) => onChange(fromZonedLocal(next, timeZone))} />;
}

function DateSideActions({ visible, buttonProps, disabled, onNow, onPush }: { visible: boolean; buttonProps?: ScheduleEditorProps["buttonProps"]; disabled?: boolean; onNow: () => void; onPush: () => void }) {
  return <div className={styles.dateActions}>{visible ? <><NowButton buttonProps={buttonProps} disabled={disabled} onClick={onNow} /><PushButton buttonProps={buttonProps} disabled={disabled} onClick={onPush} /></> : null}</div>;
}

function NowButton({ buttonProps, disabled, onClick }: { buttonProps?: ScheduleEditorProps["buttonProps"]; disabled?: boolean; onClick: () => void }) {
  return <Button {...buttonProps} className={styles.sideButton} width="2.75rem" height="2.75rem" aria-label="Set selected time to now" disabled={disabled} onClick={onClick}><Clock aria-hidden="true" size={18} /></Button>;
}

function PushButton({ buttonProps, disabled, onClick }: { buttonProps?: ScheduleEditorProps["buttonProps"]; disabled?: boolean; onClick: () => void }) {
  return <Button {...buttonProps} className={styles.sideButton} width="2.75rem" height="2.75rem" aria-label="Push selected time forward" disabled={disabled} onClick={onClick}><ArrowRight aria-hidden="true" size={18} /></Button>;
}

function normalizeScheduleComments(plan: SchedulePlan): SchedulePlan {
  const length = plan.stops.length + 2;
  const comments = plan.comments ?? [];
  return { ...plan, comments: Array.from({ length }, (_, index) => comments[index] ?? (index === 0 ? plan.comment ?? "" : "")) };
}

function pointLabel(index: number, stopCount: number) {
  if (index === 0) return "[ Start";
  if (index === stopCount + 1) return "] End";
  return `Stop ${index}`;
}

function startOfCurrentMinute() {
  const current = new Date();
  current.setSeconds(0, 0);
  return current;
}

function isScheduleCurrentOrFuture(plan: SchedulePlan) {
  const minimum = startOfCurrentMinute().getTime();
  return [plan.startAt, ...plan.stops, plan.endAt]
    .every((point) => Date.parse(point) >= minimum);
}

function normalizeDateAction(previous: SchedulePlan, next: SchedulePlan, index: number) {
  const nextPoints = [next.startAt, ...next.stops, next.endAt];
  if (Date.parse(nextPoints[index]) < Date.now()) {
    return adjustSchedulePoint(previous, index, fiveMinutesFromNow());
  }
  const earliest = Math.min(...nextPoints.map(Date.parse));
  if (earliest >= Date.now()) return next;
  const shift = Date.parse(fiveMinutesFromNow()) - earliest;
  return {
    ...next,
    startAt: new Date(Date.parse(next.startAt) + shift).toISOString(),
    stops: next.stops.map((stop) => new Date(Date.parse(stop) + shift).toISOString()),
    endAt: new Date(Date.parse(next.endAt) + shift).toISOString(),
  };
}

function fiveMinutesFromNow() { return new Date(Date.now() + 5 * 60_000).toISOString(); }

export function toZonedLocal(value: string, timeZone: string) {
  const date = new Date(value);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromZonedLocal(value: string, timeZone: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const intended = Date.UTC(year, month - 1, day, hour, minute);
  let instant = intended;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const displayed = toZonedLocal(new Date(instant).toISOString(), timeZone);
    const [shownDate, shownTime] = displayed.split("T");
    const [shownYear, shownMonth, shownDay] = shownDate.split("-").map(Number);
    const [shownHour, shownMinute] = shownTime.split(":").map(Number);
    instant += intended - Date.UTC(
      shownYear, shownMonth - 1, shownDay, shownHour, shownMinute,
    );
  }
  return new Date(instant).toISOString();
}

export function adjustScheduleStart(
  plan: SchedulePlan,
  startAt: string,
): SchedulePlan {
  return adjustSchedulePoint(plan, 0, startAt);
}

export function adjustSchedulePoint(plan: SchedulePlan, index: number, value: string): SchedulePlan {
  const points = [plan.startAt, ...plan.stops, plan.endAt].map(Date.parse);
  const next = Date.parse(value);
  const previous = points[index];
  if (!Number.isFinite(next) || previous === undefined) return plan;
  const shift = next - previous;
  points[index] = next;
  if (index < points.length - 1 && next >= points[index + 1]) {
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) points[nextIndex] += shift;
  } else if (index > 0 && next <= points[index - 1]) {
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) points[previousIndex] += shift;
  }
  return {
    ...plan,
    startAt: new Date(points[0]).toISOString(),
    stops: points.slice(1, -1).map((point) => new Date(point).toISOString()),
    endAt: new Date(points.at(-1)!).toISOString(),
  };
}

export function pushSchedulePoint(plan: SchedulePlan, index: number, part: DateInputPart, timeZone: string): SchedulePlan {
  const point = [plan.startAt, ...plan.stops, plan.endAt][index];
  if (!point) return plan;
  const local = toZonedLocal(point, timeZone);
  const [datePart, timePart] = local.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (part === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  if (part === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  if (part === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (part === "hour") next.setUTCHours(next.getUTCHours() + 1);
  if (part === "minute") next.setUTCMinutes(next.getUTCMinutes() + 5);
  if (part === "meridiem") next.setUTCHours(next.getUTCHours() + 12);
  return adjustSchedulePoint(plan, index, fromZonedLocal(next.toISOString().slice(0, 16), timeZone));
}
