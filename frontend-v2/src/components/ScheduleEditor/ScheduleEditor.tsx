import { useState } from "react";
import type { SchedulePlan } from "@flydeck/shared/v2";
import { Minus, Plus } from "lucide-react";
import { Button, type ButtonProps } from "../Button";
import { Base, type BaseStyleProps } from "../Base";
import { DeleteButton } from "../DeleteButton";
import styles from "./ScheduleEditor.module.css";

export type ScheduleEditorProps = {
  value: SchedulePlan;
  disabled?: boolean;
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  onSave: (value: SchedulePlan) => void | Promise<unknown>;
} & BaseStyleProps;

export function ScheduleEditor({ value, disabled, buttonProps, onSave, ...baseProps }: ScheduleEditorProps) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(value);
  const [saving, setSaving] = useState(false);
  const update = (change: Partial<SchedulePlan>) => setDraft((current) => ({ ...current, ...change }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const valid = Date.parse(draft.endAt) > Date.parse(draft.startAt)
    && draft.stops.every((stop, index) => Date.parse(stop) > Date.parse(draft.startAt)
      && Date.parse(stop) < Date.parse(draft.endAt)
      && (index === 0 || Date.parse(stop) > Date.parse(draft.stops[index - 1])));
  async function save() {
    if (!dirty || !valid || saving || !draft.timeZone.trim()) return;
    setSaving(true);
    try {
      const result = await onSave(draft);
      if (result !== false) setSaved(draft);
    } catch {
      // Keep the editor dirty so the user can retry.
    } finally {
      setSaving(false);
    }
  }
  return <Base {...baseProps} componentName="ScheduleEditor" className={styles.root}>
    <div className={styles.times}>
      <DateField label="[Start" value={draft.startAt} disabled={disabled} onChange={(startAt) => update({ startAt })} />
      <DateField label="]End" value={draft.endAt} disabled={disabled} onChange={(endAt) => update({ endAt })} />
    </div>
    <div className={styles.stops}>
      {draft.stops.map((stop, index) => <div className={styles.stop} key={`${index}-${stop}`}>
        <DateField label={`Stop ${index + 1}`} value={stop} disabled={disabled} onChange={(next) => update({ stops: draft.stops.map((item, itemIndex) => itemIndex === index ? next : item) })} />
        <DeleteButton {...buttonProps} disabled={disabled} label={`stop ${index + 1}`}
          onDelete={() => update({ stops: draft.stops.filter((_, itemIndex) => itemIndex !== index) })} />
      </div>)}
    </div>
    <div className={styles.actions}>
      <Button {...buttonProps} disabled={disabled || draft.stops.length >= 64} onClick={() => {
        const previous = draft.stops.at(-1) ?? draft.startAt;
        const next = new Date((Date.parse(previous) + Date.parse(draft.endAt)) / 2).toISOString();
        update({ stops: [...draft.stops, next] });
      }}>New stop</Button>
      <Button {...buttonProps} activeColor="COLOR_SUCCESS" disabled={disabled || !dirty || saving || !valid || !draft.timeZone.trim()} onClick={() => void save()}>Save schedule</Button>
    </div>
    <div className={styles.loopRow}>
      <Button {...buttonProps} selected={draft.enabled} disabled={disabled} onClick={() => update({ enabled: !draft.enabled })}>{draft.enabled ? "Loop on" : "Loop off"}</Button>
      <div className={styles.repetitions}>
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
      </div>
    </div>
    {!valid ? <output className={styles.error}>Start &lt; stops &lt; end is required.</output> : null}
  </Base>;
}

function DateField({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className={styles.inlineField}><span>{label}</span><input type="datetime-local" value={toLocal(value)} disabled={disabled} onChange={(event) => onChange(new Date(event.target.value).toISOString())} /></label>;
}

function toLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
