import { describe, expect, it } from "vitest";
import { getCronRangeRingMarks, getDurationScaleMarks } from "./dialModel";

describe("cron dial model", () => {
  it("builds the one-year duration scale", () => {
    const marks = getDurationScaleMarks(1);
    expect(marks[0]).toEqual({ hours: 0, label: "0h" });
    expect(marks.at(-1)).toEqual({ hours: 8760, label: "1y" });
  });

  it("extends duration scales in quarterly steps", () => {
    const marks = getDurationScaleMarks(2);
    expect(marks).toContainEqual({ hours: 12_960, label: "18m" });
    expect(marks.at(-1)).toEqual({ hours: 17_520, label: "2y" });
  });

  it("creates twelve evenly spaced range labels", () => {
    const marks = getCronRangeRingMarks(8760);
    expect(marks).toHaveLength(12);
    marks.forEach((mark, index) => {
      expect(mark.value).toBeCloseTo(index * (100 / 12));
    });
  });
});
