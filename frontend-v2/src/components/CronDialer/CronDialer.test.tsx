import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CRON_MAX_HALF_RANGE_MS,
  CRON_MIN_HALF_RANGE_MS,
  CRON_HALF_RANGES_MS,
  CRON_VERTICAL_STEPS_MS,
  CronDialer,
  cronEventDraftSlice,
  cronEventsSlice,
  cronEndpointOverlay,
  cronAvailableHeight,
  cronCenterFromVerticalDrag,
  cronAdjacentRange,
  cronTimelineMarks,
  cronTimelineMinorMarks,
  cronTimelineEventBlocks,
  cronVerticalStep,
  ensureCronEndAfterStart,
  keepCronEndAfterStart,
  keepCronStartBeforeEnd,
  formatCronGrid,
  formatCronRange,
  formatCronTimelineTime,
  snapCronTimeToRange,
} from "./CronDialer";

describe("CronDialer", () => {
  it("renders a viewport-filling vertical timeline centered on the selected time", () => {
    const markup = renderToStaticMarkup(
      <CronDialer
        initialTime={new Date(2026, 7, 12, 9, 5)}
        pointerButtonProps={{
          deltaY: "0.3125rem",
          padding: "0",
          primaryFontSize: "28px",
          secondaryFontSize: "0.72em",
          width: "min(16.5rem, calc(100% - 6.9375rem))",
        }}
        pointerProps={{ lineWidth: "0.125rem", tipRadius: "0.4rem" }}
      />,
    );

    expect(markup).toContain('aria-label="Cron timeline"');
    expect(markup).toContain('data-component-name="CronDialer"');
    expect(markup).toContain("12.08.026 · 09:05");
    expect(markup).toContain("Mi 12.08.026 · 09:05");
    expect(markup).toContain("± 1 h · 1m");
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain('aria-label="Datasources"');
    expect(markup.indexOf('aria-label="Zoom out"')).toBeLessThan(
      markup.indexOf('aria-label="Datasources"'),
    );
    expect(markup.indexOf('aria-label="Datasources"')).toBeLessThan(
      markup.indexOf('aria-label="Zoom in"'),
    );
    expect(markup.match(/width:100%/g)).toHaveLength(7);
    expect(markup).toContain(
      'aria-label="Create event at Mi 12.08.026 · 09:05"',
    );
    expect(markup).toContain(
      "width:min(16.5rem, calc(100% - 6.9375rem));height:auto",
    );
    expect(markup).toContain('aria-label="Set start"');
    expect(markup).toContain('aria-label="Set end"');
    expect(markup).toContain(
      'aria-label="Browse without changing endpoints"',
    );
    expect(markup).toContain('data-component-name="PointerButton"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-time-endpoint="start"');
    expect(markup).toContain('data-pointer-mode="end"');
    expect(markup).toContain('data-component-name="Pointer"');
    expect(markup).toContain("--pointer-line-width:0.125rem");
    expect(markup).toContain("background:var(--color-accent-two)");
  });

  it("replaces the complete timeline with the general event form", () => {
    const markup = renderToStaticMarkup(
      <CronDialer
        initialEditorOpen
        initialTime={new Date(2026, 7, 12, 9, 5)}
      />,
    );

    expect(markup).toContain('aria-label="Event form"');
    expect(markup).toContain('aria-label="Close event form"');
    expect(markup).toContain('aria-label="Title"');
    expect(markup).toContain('aria-label="Subtitle"');
    expect(markup).toContain('aria-label="Text"');
    expect(markup).toContain('aria-label="Set start time"');
    expect(markup).toContain('aria-label="Set end time"');
    expect(markup).toContain('data-keyboard-resize="shrink"');
    expect(markup).not.toContain("<small>Start</small>");
    expect(markup).not.toContain("<small>End</small>");
    expect(markup).toContain('type="submit"');
    expect(markup).toContain(">Save</button>");
    expect(markup).toContain("background:var(--color-speech)");
    expect(markup).not.toContain('aria-label="Zoom out"');
    expect(markup).not.toContain('aria-label="Cron timeline"');
  });

  it("keeps an end time strictly after start", () => {
    const start = new Date(2026, 7, 12, 9);
    expect(ensureCronEndAfterStart(
      start,
      new Date(2026, 7, 12, 8),
      CRON_HALF_RANGES_MS[0],
    )).toEqual(new Date(2026, 7, 12, 9, 1));
    const validEnd = new Date(2026, 7, 12, 10);
    expect(ensureCronEndAfterStart(
      start,
      validEnd,
      CRON_HALF_RANGES_MS[0],
    )).toBe(validEnd);
  });

  it("keeps the opposite endpoint fixed when start or end reaches it", () => {
    const currentStart = new Date(2026, 7, 12, 8);
    const currentEnd = new Date(2026, 7, 12, 10);
    const validStart = new Date(2026, 7, 12, 9);
    const validEnd = new Date(2026, 7, 12, 11);

    expect(keepCronStartBeforeEnd(validStart, currentStart, currentEnd))
      .toBe(validStart);
    expect(keepCronStartBeforeEnd(currentEnd, currentStart, currentEnd))
      .toBe(currentStart);
    expect(keepCronEndAfterStart(validEnd, currentStart, currentEnd))
      .toBe(validEnd);
    expect(keepCronEndAfterStart(currentStart, currentStart, currentEnd))
      .toBe(currentEnd);
  });

  it("validates the persisted general event draft", () => {
    expect(cronEventDraftSlice.name).toBe("drafts.cronEvent");
    expect(cronEventDraftSlice.validate({
      endTime: "2026-08-12T10:00:00.000Z",
      startTime: "2026-08-12T09:00:00.000Z",
      subtitle: "Journal",
      text: "Entry",
      title: "Morning",
    })).toBe(true);
    expect(cronEventDraftSlice.validate({ title: "Incomplete" })).toBe(false);
  });

  it("persists valid saved events and rejects invalid intervals", () => {
    const event = {
      createdAt: "2026-08-12T08:00:00.000Z",
      endTime: "2026-08-12T10:00:00.000Z",
      id: "event-1",
      startTime: "2026-08-12T09:00:00.000Z",
      subtitle: "Journal",
      text: "Entry",
      title: "Morning",
    };

    expect(cronEventsSlice.name).toBe("events.cron");
    expect(cronEventsSlice.validate([event])).toBe(true);
    expect(cronEventsSlice.validate([{ ...event, endTime: event.startTime }]))
      .toBe(false);
  });

  it("projects saved events as overlapping blocks with newer entries last", () => {
    const older = {
      createdAt: "2026-08-12T08:00:00.000Z",
      endTime: "2026-08-12T09:30:00.000Z",
      id: "older",
      startTime: "2026-08-12T08:30:00.000Z",
      subtitle: "",
      text: "",
      title: "Older",
    };
    const newer = {
      ...older,
      createdAt: "2026-08-12T08:05:00.000Z",
      id: "newer",
      title: "Newer",
    };
    const blocks = cronTimelineEventBlocks(
      [newer, older],
      new Date("2026-08-12T09:00:00.000Z"),
      CRON_MIN_HALF_RANGE_MS,
    );

    expect(blocks.map(({ event }) => event.id)).toEqual(["older", "newer"]);
    expect(blocks[0]).toMatchObject({ height: 50, top: 25 });
  });

  it("projects the interval and the other endpoint around the active pointer", () => {
    const start = new Date("2026-08-12T09:00:00.000Z");
    const end = new Date("2026-08-12T09:30:00.000Z");

    expect(cronEndpointOverlay(
      start,
      end,
      "start",
      start,
      start,
      CRON_MIN_HALF_RANGE_MS,
    )).toEqual({
      height: 25,
      shadows: [
        { endpoint: "browse", position: 50, visible: true },
        { endpoint: "end", position: 75, visible: true },
      ],
      top: 50,
    });
    expect(cronEndpointOverlay(
      start,
      end,
      "end",
      start,
      end,
      CRON_MIN_HALF_RANGE_MS,
    )).toEqual({
      height: 25,
      shadows: [
        { endpoint: "start", position: 25, visible: true },
        { endpoint: "browse", position: 25, visible: true },
      ],
      top: 25,
    });
    expect(cronEndpointOverlay(
      start,
      end,
      "off",
      start,
      start,
      CRON_MIN_HALF_RANGE_MS,
    ).shadows).toEqual([
      { endpoint: "start", position: 50, visible: true },
      { endpoint: "end", position: 75, visible: true },
    ]);
  });

  it("clips the interval when its shadow endpoint is outside the view", () => {
    const start = new Date("2026-08-12T09:00:00.000Z");
    const overlay = cronEndpointOverlay(
      start,
      new Date("2026-08-12T12:00:00.000Z"),
      "start",
      start,
      start,
      CRON_MIN_HALF_RANGE_MS,
    );

    expect(overlay).toMatchObject({
      height: 50,
      shadows: [
        { endpoint: "browse", position: 50, visible: true },
        { endpoint: "end", position: 200, visible: false },
      ],
      top: 50,
    });
  });

  it("switches one fixed range per zoom-button action", () => {
    expect(CRON_HALF_RANGES_MS).toEqual([
      60 * 60 * 1_000,
      24 * 60 * 60 * 1_000,
      7 * 24 * 60 * 60 * 1_000,
      30 * 24 * 60 * 60 * 1_000,
      365 * 24 * 60 * 60 * 1_000,
    ]);
    expect(cronAdjacentRange(CRON_MIN_HALF_RANGE_MS, "out"))
      .toBe(CRON_HALF_RANGES_MS[1]);
    expect(cronAdjacentRange(CRON_HALF_RANGES_MS[1], "out"))
      .toBe(CRON_HALF_RANGES_MS[2]);
    expect(cronAdjacentRange(CRON_MAX_HALF_RANGE_MS, "out"))
      .toBe(CRON_MAX_HALF_RANGE_MS);
    expect(cronAdjacentRange(CRON_MAX_HALF_RANGE_MS, "in"))
      .toBe(CRON_HALF_RANGES_MS[3]);
  });

  it("fills only the viewport space remaining below its top edge", () => {
    expect(cronAvailableHeight(800, 120, 3)).toBe(677);
    expect(cronAvailableHeight(100, 120, 3)).toBe(0);
  });

  it("moves later when the timeline is dragged upward", () => {
    const initial = new Date(2026, 7, 12, 12);
    expect(cronCenterFromVerticalDrag(
      initial,
      -100,
      200,
      CRON_MIN_HALF_RANGE_MS,
    )).toEqual(new Date(2026, 7, 12, 13));
    expect(cronCenterFromVerticalDrag(
      initial,
      100,
      200,
      CRON_MIN_HALF_RANGE_MS,
    )).toEqual(new Date(2026, 7, 12, 11));
  });

  it("snaps vertical movement to the grid owned by each range", () => {
    expect(CRON_VERTICAL_STEPS_MS).toEqual([
      60 * 1_000,
      10 * 60 * 1_000,
      60 * 60 * 1_000,
      12 * 60 * 60 * 1_000,
      24 * 60 * 60 * 1_000,
    ]);
    CRON_HALF_RANGES_MS.forEach((range, index) => {
      expect(cronVerticalStep(range)).toBe(CRON_VERTICAL_STEPS_MS[index]);
    });
    expect(snapCronTimeToRange(
      new Date(2026, 7, 12, 9, 7, 40),
      CRON_HALF_RANGES_MS[1],
    )).toEqual(new Date(2026, 7, 12, 9, 10));
    expect(snapCronTimeToRange(
      new Date(2026, 7, 12, 9, 0),
      CRON_HALF_RANGES_MS[3],
    )).toEqual(new Date(2026, 7, 12, 6));
    expect(snapCronTimeToRange(
      new Date(2026, 7, 12, 16, 0),
      CRON_HALF_RANGES_MS[3],
    )).toEqual(new Date(2026, 7, 12, 18));
    expect(snapCronTimeToRange(
      new Date(2026, 7, 12, 20, 0),
      CRON_HALF_RANGES_MS[4],
    )).toEqual(new Date(2026, 7, 13));
  });

  it("keeps a readable mark density at the minimum zoom range", () => {
    const center = new Date(2026, 7, 12, 12);
    const marks = cronTimelineMarks(center, CRON_MIN_HALF_RANGE_MS);
    expect(marks.length).toBeGreaterThanOrEqual(6);
    expect(marks.length).toBeLessThanOrEqual(11);
    expect(marks.every(({ position }) => position >= 0 && position <= 100))
      .toBe(true);
  });

  it("adds two five-minute ticks between labeled marks in the 1-hour range", () => {
    const center = new Date(2026, 7, 12, 9);
    const majorMarks = cronTimelineMarks(center, CRON_MIN_HALF_RANGE_MS);
    const minorMarks = cronTimelineMinorMarks(
      center,
      CRON_MIN_HALF_RANGE_MS,
      majorMarks,
    );
    const firstMajorTime = majorMarks[0].time.getTime();
    const secondMajorTime = majorMarks[1].time.getTime();
    const marksBetween = minorMarks.filter(({ time }) => (
      time.getTime() > firstMajorTime && time.getTime() < secondMajorTime
    ));

    expect(secondMajorTime - firstMajorTime).toBe(15 * 60 * 1_000);
    expect(marksBetween).toHaveLength(2);
    expect(marksBetween[1].time.getTime() - marksBetween[0].time.getTime())
      .toBe(5 * 60 * 1_000);
  });

  it("adds one thinner tick between labels in every wider zoom range", () => {
    for (const range of CRON_HALF_RANGES_MS.slice(1)) {
      const center = new Date(2026, 7, 12, 9);
      const majorMarks = cronTimelineMarks(center, range);
      const minorMarks = cronTimelineMinorMarks(center, range, majorMarks);

      expect(minorMarks).toHaveLength(Math.max(0, majorMarks.length - 1));
      expect(minorMarks[0]?.time.getTime()).toBe(Math.round(
        (majorMarks[0].time.getTime() + majorMarks[1].time.getTime()) / 2,
      ));
    }
  });

  it("shows times in the 24-hour range and dates only at day boundaries", () => {
    const marks = cronTimelineMarks(
      new Date(2026, 7, 12, 12),
      CRON_HALF_RANGES_MS[1],
    );
    const midnightMarks = marks.filter(({ time }) => (
      time.getHours() === 0 && time.getMinutes() === 0
    ));
    const timeMarks = marks.filter(({ time }) => time.getHours() !== 0);

    expect(midnightMarks.map(({ label }) => label)).toEqual(["12.08", "13.08"]);
    expect(timeMarks.every(({ label }) => /^\d{2}:\d{2}$/.test(label))).toBe(true);
  });

  it("shows one mark for every day in the 7-day range", () => {
    const marks = cronTimelineMarks(
      new Date(2026, 7, 12, 12),
      CRON_HALF_RANGES_MS[2],
    );

    expect(marks).toHaveLength(14);
    expect(marks.every(({ label }) => /^\d{2}\.\d{2}$/.test(label))).toBe(true);
    expect(marks.slice(1).every((mark, index) => (
      mark.time.getDate() !== marks[index].time.getDate()
    ))).toBe(true);
    expect(marks.find(({ time }) => time.getDay() === 6)?.dayTone)
      .toBe("saturday");
    expect(marks.find(({ time }) => time.getDay() === 0)?.dayTone)
      .toBe("sunday");
  });

  it("shows every month in the 1-year range and the year at January", () => {
    const marks = cronTimelineMarks(
      new Date(2026, 7, 12, 12),
      CRON_MAX_HALF_RANGE_MS,
    );

    expect(marks).toHaveLength(24);
    expect(marks.filter(({ time }) => time.getMonth() === 0).map(({ label }) => label))
      .toEqual(["2026", "2027"]);
    expect(marks.find(({ time }) => (
      time.getFullYear() === 2026 && time.getMonth() === 2
    ))?.label).toBe("Mär");
    expect(marks.every(({ position }) => position >= 0 && position <= 100))
      .toBe(true);
  });

  it("formats the timeline center and half-range", () => {
    expect(formatCronTimelineTime(new Date(2026, 7, 12, 9, 5))).toBe(
      "12.08.026 · 09:05",
    );
    expect(formatCronRange(CRON_MIN_HALF_RANGE_MS)).toBe("1 h");
    expect(formatCronRange(CRON_HALF_RANGES_MS[1])).toBe("24 h");
    expect(formatCronRange(CRON_HALF_RANGES_MS[2])).toBe("7 d");
    expect(formatCronRange(CRON_HALF_RANGES_MS[3])).toBe("1 m");
    expect(formatCronRange(CRON_MAX_HALF_RANGE_MS)).toBe("1 y");
    expect(CRON_HALF_RANGES_MS.map(formatCronGrid)).toEqual([
      "1m",
      "10m",
      "1h",
      "12h",
      "1d",
    ]);
  });
});
