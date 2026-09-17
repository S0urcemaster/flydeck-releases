import { describe, expect, it } from "vitest";
import { scheduleOccurrences, schedulePlanSchema } from "./schedules";

describe("schedule plans", () => {
  it("fires the start and intermediate stops, but never the loop end", () => {
    const plan = schedulePlanSchema.parse({
      startAt: "2026-09-16T08:00:00.000Z",
      endAt: "2026-09-16T09:00:00.000Z",
      stops: ["2026-09-16T08:20:00.000Z", "2026-09-16T08:45:00.000Z"],
      repetitions: 1, timeZone: "Europe/Berlin", enabled: true,
    });
    expect(scheduleOccurrences(plan)).toEqual([
      "2026-09-16T08:00:00.000Z", "2026-09-16T08:20:00.000Z",
      "2026-09-16T08:45:00.000Z", "2026-09-16T09:00:00.000Z",
      "2026-09-16T09:20:00.000Z", "2026-09-16T09:45:00.000Z",
    ]);
  });
});
