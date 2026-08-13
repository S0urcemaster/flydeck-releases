import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CronDialer,
  cronRangeMinutes,
  cronTimeMarks,
  cronTimeSegment,
  cronZoomAngle,
  formatCronTime,
} from "./CronDialer";

describe("CronDialer", () => {
  it("specializes the wheel Dialer with a time and zoom scale", () => {
    const markup = renderToStaticMarkup(
      <CronDialer
        centerFontSize="18px"
        centerFontWeight="700"
        centerButtonProps={{ height: "50%", width: "50%" }}
        initialTime={new Date(2026, 7, 12, 9, 5)}
        innerDiscColor="#112233"
        innerGradientEnd="blue"
        innerGradientStart="red"
        innerScaleFontSize="12px"
        innerScaleFontWeight="600"
        outerDiscColor="#445566"
        outerGradientEnd="yellow"
        outerGradientStart="green"
        outerScaleFontSize="14px"
        outerScaleFontWeight="500"
      />,
    );

    expect(markup).toContain('aria-label="Cron dialer"');
    expect(markup).toContain("width:100%");
    expect(markup).toContain("width:50%;height:50%");
    expect(markup.match(/--dial-marker-angle:0deg/g)).toHaveLength(2);
    expect(markup).toContain(">1h</span>");
    expect(markup).toContain(">5y</span>");
    expect(markup).not.toContain(">6h</span>");
    expect(markup).not.toContain(">3m</span>");
    expect(markup).not.toContain(">2y</span>");
    expect(markup).toContain("--cron-mark-angle:0deg");
    expect(markup).toContain("--cron-mark-angle:270deg");
    expect(markup).toContain(">026.08.12 09:05</button>");
    expect(markup).toContain("font-size:18px");
    expect(markup).toContain("font-weight:700");
    expect(markup).toContain("font-size:12px");
    expect(markup).toContain("font-weight:600");
    expect(markup).toContain("background:#112233");
    expect(markup).toContain("--cron-gradient-start:red");
    expect(markup).toContain("--cron-gradient-end:blue");
    expect(markup).toContain("font-size:14px");
    expect(markup).toContain("font-weight:500");
    expect(markup).toContain("background:#445566");
    expect(markup).toContain("--cron-gradient-start:green");
    expect(markup).toContain("--cron-gradient-end:yellow");
  });

  it("zooms logarithmically from one hour to five years", () => {
    const anchors = [
      60,
      24 * 60,
      7 * 24 * 60,
      30 * 24 * 60,
      365 * 24 * 60,
      5 * 365 * 24 * 60,
    ];
    anchors.forEach((minutes, index) => {
      expect(cronZoomAngle(minutes)).toBe(index * 54);
      expect(cronRangeMinutes(index * 54)).toBeCloseTo(minutes);
    });
  });

  it("keeps a useful mark density around the selected time", () => {
    const marks = cronTimeMarks(new Date(2026, 7, 12, 9, 5), 60);
    expect(marks.length).toBeGreaterThanOrEqual(6);
    expect(marks.length).toBeLessThanOrEqual(15);
    expect(formatCronTime(new Date(2026, 7, 12, 9, 5))).toBe(
      "026.08.12 09:05",
    );

    const dayLabels = cronTimeMarks(
      new Date(2026, 7, 12, 12),
      7 * 24 * 60,
    ).map(({ label }) => label).filter(Boolean);
    expect(new Set(dayLabels).size).toBe(dayLabels.length);
    expect(dayLabels.filter((label) => label === "12.08")).toHaveLength(1);
  });

  it("marks the proportional selected calendar period on the time scale", () => {
    const selected = new Date(2026, 7, 12, 12);
    const hour = cronTimeSegment(selected, 60);
    expect(hour?.period).toBe("hour");
    expect(hour?.start).toEqual(new Date(2026, 7, 12, 12));
    expect(hour?.end).toEqual(new Date(2026, 7, 12, 13));
    expect(hour?.sweepAngle).toBe(360);
    const twelveHours = cronTimeSegment(selected, 12 * 60);
    expect(twelveHours?.period).toBe("hour");
    expect(twelveHours?.start).toEqual(new Date(2026, 7, 12, 12));
    expect(twelveHours?.end).toEqual(new Date(2026, 7, 12, 13));
    expect(twelveHours?.sweepAngle).toBe(30);
    const day = cronTimeSegment(selected, 3 * 24 * 60);
    expect(day?.period).toBe("day");
    expect(day?.start).toEqual(new Date(2026, 7, 12));
    expect(day?.end).toEqual(new Date(2026, 7, 13));
    expect(day?.startAngle).toBe(-60);
    expect(day?.sweepAngle).toBe(120);
    const week = cronTimeSegment(selected, 14 * 24 * 60);
    expect(week?.period).toBe("week");
    expect(week?.start).toEqual(new Date(2026, 7, 10));
    expect(week?.end).toEqual(new Date(2026, 7, 17));
    expect(cronTimeSegment(selected, 90 * 24 * 60)?.period).toBe("month");
    expect(cronTimeSegment(selected, 5 * 365 * 24 * 60)?.period).toBe("year");
  });

  it("keeps the selected calendar period on the visible scale", () => {
    const segment = cronTimeSegment(
      new Date(2026, 7, 20, 12),
      6 * 24 * 60,
    );
    expect(segment.period).toBe("day");
    expect(segment.start).toEqual(new Date(2026, 7, 20));
    expect(segment.end).toEqual(new Date(2026, 7, 21));
    expect(segment.startAngle).toBe(-30);
    expect(segment.sweepAngle).toBe(60);
  });
});
