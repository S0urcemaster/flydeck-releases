/* eslint-disable react-hooks/refs -- The controller is a state model containing DOM refs; its other fields are ordinary render state. */
import { Repeat2, Send } from "lucide-react";
import { Editor } from "../../components/Editor";
import { RadialMark } from "../../components/RadialMark";
import { TextInput } from "../../components/TextInput";
import type {
  CharacterDialCornerAction,
  CharacterDialCorners,
  DwellMode,
} from "../../components/CharacterDial";
import {
  cronDialGeometryStyle,
  cronScaleRadius,
  cronTimeIndicatorDiameter,
  getCronRangeRingMarks,
  getDurationScaleMarks,
  type CronMode,
  type CronScaleMark,
} from "./dialModel";
import { DisplayClockTime, DisplayUnit } from "./CronDisplay";
import { getDurationParts } from "./model";
import { TimerList } from "./TimerList";
import type { CronController } from "./useCronController";

type CronWorkspaceProps = {
  controller: CronController;
  onDictate: () => void;
  dictating: boolean;
  characterDialCorners: CharacterDialCorners;
  preferredKeyboard: "system" | "mobile" | "dialer";
  dialerDefaultSize: "small" | "medium" | "large";
  characterDialRightButtons: CharacterDialCornerAction[];
  dialerDefaultDwell: DwellMode;
};

export function CronWorkspace({ controller: cron, ...props }: CronWorkspaceProps) {
  const fraction = Math.min(1, Math.max(0, (cron.hours - cron.viewStartHours) / cron.viewRangeHours));
  const needleRotation = `rotate(${fraction * 360}deg)`;
  const scaleRotation = `rotate(${cron.rangeValue * 3.6}deg)`;
  const visibleMarks = cron.zoomMode !== "OFF"
    ? getZoomMarks(cron.viewStartHours, cron.viewRangeHours, cron.mode, cron.dateAnchor)
    : cron.mode === "DURA"
      ? getDurationScaleMarks(cron.scaleMode).filter((mark) => mark.hours >= cron.viewStartHours && mark.hours <= cron.viewEndHours)
      : getDateScaleMarks(cron.dateAnchor, cron.scaleMaxHours).filter((mark) => mark.hours >= cron.viewStartHours && mark.hours <= cron.viewEndHours);
  const durationParts = getDurationParts(cron.hours);
  const scaleParts = getDurationParts(cron.rangeHours);
  const displayScaleParts = {
    ...scaleParts,
    days: scaleParts.years === 0 && scaleParts.months === 0 && scaleParts.days === 0 ? 1 : scaleParts.days,
  };
  const targetDateParts = {
    years: cron.targetDate.getFullYear() % 100,
    months: cron.targetDate.getMonth() + 1,
    days: cron.targetDate.getDate(),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(cron.targetDate).slice(0, 2).toUpperCase(),
    hours: cron.targetDate.getHours(),
    minutes: cron.targetDate.getMinutes(),
  };

  return (
    <section className="workspace cron-panel" aria-label="Cron workspace">
      <TextInput
        ref={cron.titleRef}
        inputMode="none"
        aria-label="Cron job title"
        value={cron.title}
        onChange={(event) => cron.setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (!cron.submitDisabled) void cron.submit();
        }}
        onFocus={() => cron.setTitleKeyboardActive(true)}
        onBlur={() => cron.setTitleKeyboardActive(false)}
        placeholder="Cron job title"
        readOnly={cron.selectedTimerId !== null}
      />
      <div ref={cron.titleKeyboardHostRef} />
      <Editor
        hideTextarea
        storageKey="cron-title"
        ariaLabel="Cron job title keyboard"
        placeholder=""
        value={cron.title}
        onChange={(event) => cron.setTitle(event.target.value)}
        onValueChange={cron.setTitle}
        onSelectWord={() => undefined}
        onMoveCursor={() => undefined}
        onDictate={props.onDictate}
        dictating={props.dictating}
        onSubmit={() => void cron.submit()}
        submitDisabled={cron.submitDisabled}
        characterDialCorners={props.characterDialCorners}
        preferredKeyboard={props.preferredKeyboard}
        dialerDefaultSize={props.dialerDefaultSize}
        characterDialRightButtons={props.characterDialRightButtons}
        dialerDefaultDwell={props.dialerDefaultDwell}
        temporaryInput={cron.titleKeyboardActive ? {
          ref: cron.titleRef,
          keyboardHostRef: cron.titleKeyboardHostRef,
          value: cron.title,
          onValueChange: cron.setTitle,
          onSubmit: () => void cron.submit(),
          submitDisabled: cron.submitDisabled,
        } : null}
        onDismissTemporaryInput={() => cron.setTitleKeyboardActive(false)}
      />

      <div className="cron-stage">
        <div className="cron-corner-controls" aria-label="Cron controls">
          <button className="cron-corner-button scale-mode" type="button"
            onClick={() => cron.setScaleMode((current) => current === 1 ? 2 : current === 2 ? 5 : 1)}>
            <Repeat2 size={16} /> SCAL {cron.scaleMode}y
          </button>
          <button className="cron-corner-button send primary" type="button"
            onClick={() => void cron.submit()} disabled={cron.submitDisabled}>
            <Send size={20} /> SEND
          </button>
          <button className={`cron-corner-button magnify ${cron.zoomMode !== "OFF" ? "active" : ""}`}
            type="button" onClick={cron.cycleZoom} aria-label="Zoom time scale" title="Zoom time scale">
            {cron.zoomMode === "OFF" ? "ZOOM" : cron.zoomMode.toLowerCase()} <Repeat2 size={16} />
          </button>
          <button className="cron-corner-button list-range" type="button"
            onClick={() => cron.setTimerZoom((current) => current === "1d" ? "1w" : current === "1w" ? "1m" : current === "1m" ? "1y" : current === "1y" ? "5y" : "1d")}>
            <Repeat2 size={16} /> RANG {cron.timerZoom}
          </button>
        </div>
        <div ref={cron.dialRef} className="cron-dial" style={cronDialGeometryStyle}
          aria-label="Set time value" role="slider" aria-valuemin={1}
          aria-valuemax={Math.round(cron.rangeHours * 3600)} aria-valuenow={Math.round(cron.hours * 3600)}>
          <div className="cron-time-ring" onPointerDown={cron.beginDrag}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) cron.updateAngle(event.clientX, event.clientY);
            }}
          />
          {visibleMarks.map((mark) => {
            const angle = ((mark.hours - cron.viewStartHours) / cron.viewRangeHours) * 360;
            const distanceToZero = mark.hours === 0 ? 90 : Math.min(angle, 360 - angle);
            const opacity = mark.hours === 0 ? 1 : Math.min(1, distanceToZero / 34);
            return (
              <RadialMark key={`${mark.label}-${mark.subLabel ?? ""}-${mark.hours}`} className="cron-label"
                angle={angle} radius={{ percent: 50, pixels: -cronTimeIndicatorDiameter / 2 }} opacity={opacity}>
                {mark.subLabel ? <><span>{mark.label}</span><span>{mark.subLabel}</span></> : mark.label}
              </RadialMark>
            );
          })}
          <div className="cron-time-dot" style={{ transform: needleRotation }}><span /></div>
          <div className="cron-scale-ring" onPointerDown={cron.beginScaleDrag}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) cron.updateScaleAngle(event.clientX, event.clientY);
            }}
          />
          <div className="cron-scale-dot" style={{ transform: scaleRotation }}><span /></div>
          {getCronRangeRingMarks(cron.scaleMaxHours).map((mark) => (
            <RadialMark key={`${mark.label}-${mark.value}`} className="cron-range-label"
              angle={mark.value * 3.6} radius={{ pixels: cronScaleRadius }}>
              {mark.label}
            </RadialMark>
          ))}
          <div className="cron-center cron-display">
            <button className="cron-mode-touch" type="button"
              aria-label={`Switch from ${cron.mode} to ${cron.mode === "DURA" ? "DATE" : "DURA"}`}
              onClick={() => cron.selectMode(cron.mode === "DURA" ? "DATE" : "DURA")}
            />
            <div className="cron-mode-label">{cron.mode}</div>
            <div className="display-row scale-row">
              <DisplayUnit value={displayScaleParts.years} unit="y" />
              <DisplayUnit value={displayScaleParts.months} unit="m" />
              <DisplayUnit value={displayScaleParts.days} unit="d" />
            </div>
            <div className="value-stack">
              {cron.mode === "DATE" ? <>
                <div className="display-row value-row">
                  <DisplayUnit value={targetDateParts.years} unit="y" />
                  <DisplayUnit value={targetDateParts.months} unit="m" />
                  <DisplayUnit value={targetDateParts.days} unit="d" />
                </div>
                <div className="display-row value-row time-row">
                  <DisplayClockTime hours={targetDateParts.hours} minutes={targetDateParts.minutes} />
                  <span className="weekday-display">{targetDateParts.weekday}</span>
                </div>
              </> : <>
                <div className="display-row value-row">
                  <DisplayUnit value={durationParts.years} unit="y" />
                  <DisplayUnit value={durationParts.months} unit="m" />
                  <DisplayUnit value={durationParts.days} unit="d" />
                </div>
                <div className="display-row value-row time-row">
                  <DisplayClockTime hours={durationParts.hours} minutes={durationParts.minutes} />
                </div>
              </>}
            </div>
            <div className="cron-logo">Digi Craft</div>
          </div>
        </div>
      </div>
      <TimerList timers={cron.timers} armedTimer={cron.armedDeleteTimer} selectedTimer={cron.selectedTimerId}
        onSelectOrDelete={(id) => void cron.selectOrDelete(id)} onArmDelete={cron.armDelete} zoom={cron.timerZoom} />
    </section>
  );
}

function formatDateParts(date: Date) {
  return {
    day: new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("de-DE", { month: "2-digit" }).format(date),
  };
}

function getHoursUntil(target: Date, now: Date) {
  return (target.getTime() - now.getTime()) / 3600000;
}

function getDateScaleMarks(now: Date, maxHours: number) {
  const marks: CronScaleMark[] = [{ hours: 0, label: "now" }];
  const rangeEnd = now.getTime() + maxHours * 3600 * 1000;
  const nextFullHour = new Date(now);
  nextFullHour.setHours(nextFullHour.getHours() + 1, 0, 0, 0);
  const nextMonthStart = new Date(now);
  nextMonthStart.setDate(1);
  nextMonthStart.setHours(0, 0, 0, 0);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
  const hourCursor = new Date(nextFullHour);
  for (let index = 0; index < 12; index += 1) {
    marks.push({ hours: getHoursUntil(hourCursor, now), label: String(hourCursor.getHours() || 24) });
    hourCursor.setHours(hourCursor.getHours() + 1);
  }
  const dayCursor = new Date(now);
  dayCursor.setHours(0, 0, 0, 0);
  for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
    for (const hour of [6, 9, 12, 18, 24]) {
      const markDate = new Date(dayCursor);
      markDate.setDate(dayCursor.getDate() + dayOffset + (hour === 24 ? 1 : 0));
      markDate.setHours(hour === 24 ? 0 : hour, 0, 0, 0);
      const hours = getHoursUntil(markDate, now);
      if (hours > 12) marks.push({ hours, label: String(hour) });
    }
  }
  for (let dayOffset = 2; dayOffset <= 7; dayOffset += 1) {
    const markDate = new Date(dayCursor);
    markDate.setDate(dayCursor.getDate() + dayOffset);
    markDate.setHours(12, 0, 0, 0);
    const hours = getHoursUntil(markDate, now);
    if (hours > 0) marks.push({ hours, label: "12" });
  }
  const dateCursor = new Date(now);
  dateCursor.setHours(0, 0, 0, 0);
  dateCursor.setDate(dateCursor.getDate() + 1);
  for (let dayOffset = 1; dayOffset <= 30; dayOffset += 1) {
    const markDate = new Date(dateCursor);
    markDate.setDate(dateCursor.getDate() + dayOffset - 1);
    const daysSinceMonth = Math.floor((markDate.getTime() - nextMonthStart.getTime()) / 86400000);
    if (daysSinceMonth >= 0 && (daysSinceMonth === 0 || daysSinceMonth % 3 !== 0)) continue;
    const parts = formatDateParts(markDate);
    marks.push({ hours: getHoursUntil(markDate, now), label: parts.day, subLabel: parts.month });
  }
  const cursor = new Date(nextMonthStart);
  while (cursor.getTime() <= rangeEnd) {
    marks.push({ hours: getHoursUntil(cursor, now), label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const unique = new Map<number, CronScaleMark>();
  for (const mark of marks) {
    if (mark.hours >= 0 && mark.hours <= maxHours) unique.set(Math.round(mark.hours * 60), mark);
  }
  return [...unique.values()].sort((left, right) => left.hours - right.hours);
}

function getZoomMarks(startHours: number, rangeHours: number, mode: CronMode, anchor: Date): CronScaleMark[] {
  if (rangeHours > 24) {
    if (mode !== "DATE") return Array.from({ length: 33 }, (_, index) => ({
      hours: startHours + index * 24,
      label: `${index === 16 ? 0 : index - 16}d`,
    }));
    const viewStart = new Date(anchor.getTime() + startHours * 3600000);
    const viewEnd = anchor.getTime() + (startHours + rangeHours) * 3600000;
    const cursor = new Date(viewStart);
    cursor.setHours(12, 0, 0, 0);
    if (cursor.getTime() < viewStart.getTime()) cursor.setDate(cursor.getDate() + 1);
    const marks: CronScaleMark[] = [];
    while (cursor.getTime() <= viewEnd) {
      const parts = formatDateParts(cursor);
      marks.push({ hours: getHoursUntil(cursor, anchor), label: parts.day, subLabel: parts.month });
      cursor.setDate(cursor.getDate() + 1);
    }
    return marks;
  }
  if (mode === "DATE") {
    const viewStart = new Date(anchor.getTime() + startHours * 3600000);
    const viewEnd = anchor.getTime() + (startHours + rangeHours) * 3600000;
    const cursor = new Date(viewStart);
    cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
    if (cursor.getTime() - 3600000 >= viewStart.getTime()) cursor.setHours(cursor.getHours() - 1);
    const marks: CronScaleMark[] = [];
    while (cursor.getTime() <= viewEnd) {
      if (cursor.getTime() >= viewStart.getTime()) {
        marks.push({ hours: getHoursUntil(cursor, anchor), label: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23" }).format(cursor) });
      }
      cursor.setHours(cursor.getHours() + 1);
    }
    return marks;
  }
  const halfRange = rangeHours / 2;
  return Array.from({ length: Math.round(rangeHours) + 1 }, (_, index) => {
    const relative = index - halfRange;
    return {
      hours: startHours + halfRange + relative,
      label: relative === 0 ? "0h" : `${relative > 0 ? "+" : ""}${relative}h`,
    };
  });
}
