import { useState } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { DialButton } from "../DialButton";
import styles from "./DateInput.module.css";

export type DateInputPart = "year" | "month" | "day" | "hour" | "minute" | "meridiem";

export type DateInputProps = BaseStyleProps & {
  active?: boolean;
  buttonProps?: Omit<ButtonProps, "children" | "onClick" | "selected">;
  disabled?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPartChange?: (part: DateInputPart) => void;
  onSelect: () => void;
};

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const minuteGroups = Array.from({ length: 12 }, (_, index) => Array.from({ length: 5 }, (_, offset) => String(index * 5 + offset).padStart(2, "0")));

export function DateInput({ active = false, buttonProps, disabled, label, value, onChange, onPartChange, onSelect, ...baseProps }: DateInputProps) {
  const date = parseLocalDate(value);
  const [part, setPart] = useState<DateInputPart>("year");
  const [now] = useState(() => new Date());
  const years = Array.from({ length: 12 }, (_, index) => date.year - 4 + index);
  const days = daysInMonth(date.year, date.month);

  function select(nextPart: DateInputPart) { setPart(nextPart); onPartChange?.(nextPart); onSelect(); }
  function change(change: Partial<LocalDate>) {
    const next = { ...date, ...change };
    next.day = Math.min(next.day, daysInMonth(next.year, next.month));
    onChange(formatLocalDate(next));
  }

  return <Base {...baseProps} componentName="DateInput" className={styles.root}>
    <div className={styles.line} aria-label={label}>
      <span className={styles.name}>{label}</span>
      <Segment selected={active && part === "year"} disabled={disabled} onClick={() => select("year")}>{String(date.year % 1000).padStart(3, "0")}</Segment><span>/</span>
      <Segment selected={active && part === "month"} disabled={disabled} onClick={() => select("month")}>{String(date.month).padStart(2, "0")}</Segment><span>/</span>
      <Segment selected={active && part === "day"} disabled={disabled} onClick={() => select("day")}>{String(date.day).padStart(2, "0")}</Segment><span>,</span>
      <Segment selected={active && part === "hour"} disabled={disabled} onClick={() => select("hour")}>{String(toTwelveHour(date.hour)).padStart(2, "0")}</Segment><span>:</span>
      <Segment selected={active && part === "minute"} disabled={disabled} onClick={() => select("minute")}>{String(date.minute).padStart(2, "0")}</Segment>
      <button className={`${styles.segment} ${date.hour < 12 ? styles.am : styles.pm}`} type="button" aria-pressed={active && part === "meridiem"} disabled={disabled} onClick={() => select("meridiem")}>{date.hour < 12 ? "AM" : "PM"}</button>
    </div>
    {active ? <div className={`${styles.keyboard} ${part === "day" ? styles.days : styles.standard}`} data-layer={part}>
      {part === "year" ? years.map((year) => <Button {...buttonProps} className={year === now.getFullYear() ? styles.now : undefined} key={year} selected={date.year === year} disabled={disabled} onClick={() => change({ year })}>{String(year % 1000).padStart(3, "0")}</Button>) : null}
      {part === "month" ? months.map((month, index) => <Button {...buttonProps} className={index === now.getMonth() ? styles.now : undefined} key={month} selected={date.month === index + 1} disabled={disabled} onClick={() => change({ month: index + 1 })}>{month}</Button>) : null}
      {part === "day" ? Array.from({ length: days }, (_, index) => index + 1).map((day) => <Button {...buttonProps} className={day === now.getDate() ? styles.now : undefined} key={day} selected={date.day === day} disabled={disabled} onClick={() => change({ day })}>{day}</Button>) : null}
      {part === "hour" ? Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => <Button {...buttonProps} className={hour === toTwelveHour(now.getHours()) ? styles.now : undefined} key={hour} selected={toTwelveHour(date.hour) === hour} disabled={disabled} onClick={() => change({ hour: hour % 12 + (date.hour < 12 ? 0 : 12) })}>{hour}</Button>) : null}
      {part === "minute" ? minuteGroups.map((options) => <DialButton {...buttonProps} className={options.includes(String(now.getMinutes()).padStart(2, "0")) ? styles.now : undefined} key={options[0]} options={options} disabled={disabled} selected={options.includes(String(date.minute).padStart(2, "0"))} onDial={(minute) => change({ minute: Number(minute) })} />) : null}
      {part === "meridiem" ? <><Button {...buttonProps} className={now.getHours() < 12 ? styles.now : undefined} selected={date.hour < 12} disabled={disabled} onClick={() => change({ hour: date.hour % 12 })}>AM</Button><Button {...buttonProps} className={now.getHours() >= 12 ? styles.now : undefined} selected={date.hour >= 12} disabled={disabled} onClick={() => change({ hour: date.hour % 12 + 12 })}>PM</Button></> : null}
    </div> : null}
  </Base>;
}

function Segment({ children, disabled, selected, onClick }: { children: string; disabled?: boolean; selected: boolean; onClick: () => void }) {
  return <button className={styles.segment} type="button" aria-pressed={selected} disabled={disabled} onClick={onClick}>{children}</button>;
}

type LocalDate = { year: number; month: number; day: number; hour: number; minute: number };
function parseLocalDate(value: string): LocalDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() }; }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]) };
}
function formatLocalDate(value: LocalDate) { return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`; }
function daysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate(); }
function toTwelveHour(hour: number) { return hour % 12 || 12; }
