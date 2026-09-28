import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  adjustSchedulePoint,
  adjustScheduleStart,
  pushSchedulePoint,
  ScheduleEditor,
  fromZonedLocal,
  toZonedLocal,
} from "./ScheduleEditor";

describe("ScheduleEditor timezone conversion", () => {
  it("uses Berlin wall-clock time independently of the browser timezone", () => {
    const instant = "2026-09-19T12:00:00.000Z";
    expect(toZonedLocal(instant, "Europe/Berlin")).toBe("2026-09-19T14:00");
    expect(fromZonedLocal("2026-09-19T14:00", "Europe/Berlin")).toBe(instant);
  });
});

describe("ScheduleEditor controls", () => {
  it("can render the reduced schedule used by Idols", () => {
    const markup = renderToStaticMarkup(createElement(ScheduleEditor, { value: {
      comment: "", comments: ["", ""],
      startAt: "2026-09-20T12:00:00.000Z", stops: [],
      endAt: "2026-09-20T13:00:00.000Z", repetitions: 0,
      timeZone: "UTC", enabled: false, notifyWithNtfy: false,
    }, showActivationButton: false, showComment: false, showNtfyToggle: false,
      showRepetitions: false, showSaveButton: false, onSave: () => undefined }));
    expect(markup).not.toContain("Active");
    expect(markup).not.toContain("Save schedule");
    expect(markup).not.toContain("Notify with ntfy");
    expect(markup).not.toContain("Repetitions");
    expect(markup).not.toContain("Schedule comment");
    expect(markup).toContain("New stop");
  });
});

describe("adjustScheduleStart", () => {
  it("moves the end and stops when the start passes the previous end", () => {
    const adjusted = adjustScheduleStart({
      comment: "Test",
      comments: ["Test", "", ""],
      startAt: "2026-09-19T12:00:00.000Z",
      endAt: "2026-09-19T13:00:00.000Z",
      stops: ["2026-09-19T12:30:00.000Z"],
      repetitions: 0,
      timeZone: "Europe/Berlin",
      enabled: false,
      notifyWithNtfy: false,
    }, "2026-09-19T14:00:00.000Z");

    expect(adjusted.startAt).toBe("2026-09-19T14:00:00.000Z");
    expect(adjusted.stops).toEqual(["2026-09-19T14:30:00.000Z"]);
    expect(adjusted.endAt).toBe("2026-09-19T15:00:00.000Z");
  });

  it("moves following points when a stop passes its successor", () => {
    const adjusted = adjustSchedulePoint({
      comment: "", comments: ["", "", "", ""],
      startAt: "2026-09-20T10:00:00.000Z",
      stops: ["2026-09-20T11:00:00.000Z", "2026-09-20T12:00:00.000Z"],
      endAt: "2026-09-20T13:00:00.000Z",
      repetitions: 0, timeZone: "Europe/Berlin", enabled: false,
      notifyWithNtfy: true,
    }, 1, "2026-09-20T12:30:00.000Z");
    expect(adjusted.stops).toEqual([
      "2026-09-20T12:30:00.000Z",
      "2026-09-20T13:30:00.000Z",
    ]);
    expect(adjusted.endAt).toBe("2026-09-20T14:30:00.000Z");
  });

  it("moves preceding points when the end passes its predecessor", () => {
    const adjusted = adjustSchedulePoint({
      comment: "", comments: ["", "", ""],
      startAt: "2026-09-20T10:00:00.000Z",
      stops: ["2026-09-20T11:00:00.000Z"],
      endAt: "2026-09-20T12:00:00.000Z",
      repetitions: 0, timeZone: "Europe/Berlin", enabled: false,
      notifyWithNtfy: true,
    }, 2, "2026-09-20T10:30:00.000Z");
    expect(adjusted.startAt).toBe("2026-09-20T08:30:00.000Z");
    expect(adjusted.stops).toEqual(["2026-09-20T09:30:00.000Z"]);
    expect(adjusted.endAt).toBe("2026-09-20T10:30:00.000Z");
  });

  it("pushes the focused minute segment by five minutes", () => {
    const adjusted = pushSchedulePoint({
      comment: "", comments: ["", ""],
      startAt: "2026-09-20T10:00:00.000Z", stops: [],
      endAt: "2026-09-20T11:00:00.000Z", repetitions: 0,
      timeZone: "UTC", enabled: false, notifyWithNtfy: true,
    }, 0, "minute", "UTC");
    expect(adjusted.startAt).toBe("2026-09-20T10:05:00.000Z");
    expect(adjusted.endAt).toBe("2026-09-20T11:00:00.000Z");
  });
});
