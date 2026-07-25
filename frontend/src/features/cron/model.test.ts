import { describe, expect, it } from "vitest";
import { formatDuration, formatExactDuration, getCronSnapStepHours, getDurationParts, hoursToRangeSliderValue, rangeSliderToHours, snapDateToLocalStep, toSegmentDigits } from "./model";

describe("cron model", () => {
  it("maps the scale endpoints to 12 hours and one year", () => {
    expect(rangeSliderToHours(0)).toBe(12);
    expect(rangeSliderToHours(100)).toBe(8760);
  });

  it("selects increasingly coarse snap steps", () => {
    expect(getCronSnapStepHours(24)).toBe(5 / 60);
    expect(getCronSnapStepHours(24.01)).toBe(15 / 60);
    expect(getCronSnapStepHours(48)).toBe(15 / 60);
    expect(getCronSnapStepHours(8760)).toBe(24);
  });

  it("formats compact and exact durations", () => {
    expect(formatDuration(72)).toBe("3 d");
    expect(formatExactDuration(25.5)).toBe("1d 1h 30m 0s");
  });

  it("builds the segmented display values", () => {
    expect(getDurationParts(8760 + 24 + 1.5)).toEqual({ years: 1, months: 0, days: 1, hours: 1, minutes: 30 });
    expect(toSegmentDigits(7)).toBe("🯰🯷");
  });

  it("aligns three-hour date snapping to local clock hours", () => {
    const target = new Date(2026, 6, 20, 4, 20);
    expect(snapDateToLocalStep(target, 3).getHours()).toBe(3);
    expect(snapDateToLocalStep(new Date(2026, 6, 20, 5, 10), 3).getHours()).toBe(6);
  });

  it("round-trips the logarithmic range scale", () => {
    expect(rangeSliderToHours(hoursToRangeSliderValue(168))).toBeCloseTo(168);
    expect(rangeSliderToHours(hoursToRangeSliderValue(30_000, 43_800), 43_800)).toBeCloseTo(30_000);
  });
});
