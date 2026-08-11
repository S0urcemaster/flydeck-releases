import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CronDialer,
  formatCronDurationDisplay,
  formatCronDate,
  getCronOuterScaleMarks,
  getCronOuterIntervalMinutes,
  getCronOuterMarkAngle,
  getCronZoomedOuterPointer,
  getCronScaleAngle,
  getCronScaleMinutes,
  getCronSelectedDurationMinutes,
} from "./CronDialer";

describe("CronDialer", () => {
  it("composes the independent scale and value rings", () => {
    const markup = renderToStaticMarkup(<CronDialer />);

    expect(markup).toContain('aria-label="Cron dialer"');
    expect(markup).toContain('aria-label="Show date"');
    expect(markup).toContain(">000.00.00 00:00</span>");
    expect(markup.match(/data-layer=/g)).toHaveLength(2);
    expect(markup).toContain("--dial-marker-angle:2.5deg");
    expect(markup).toContain("--dial-marker-angle:0deg");
    expect(markup).toContain(">1h</span>");
    expect(markup).toContain(">24h</span>");
    expect(markup).toContain(">7d</span>");
    expect(markup).toContain(">5y</span>");
    expect(markup).toContain(">5m</span>");
    expect(markup).toContain(">SCALE</button>");
    expect(markup).toContain(">SEND</button>");
    expect(markup).toContain(">RANGE</button>");
    expect(markup).toContain(">ZOOM</button>");
  });

  it("maps the inner ring logarithmically across a five-degree north dead zone", () => {
    expect(getCronScaleAngle(0)).toBe(2.5);
    expect(getCronScaleAngle(359)).toBe(357.5);
    expect(getCronScaleMinutes(2.5)).toBeCloseTo(60);
    expect(getCronScaleMinutes(357.5)).toBeCloseTo(5 * 365 * 24 * 60);
    expect(getCronScaleMinutes(180)).toBeCloseTo(
      Math.sqrt(60 * 5 * 365 * 24 * 60),
    );
  });

  it("uses five-minute labels and values at the one-hour scale", () => {
    expect(getCronSelectedDurationMinutes(2.5, 180)).toBeCloseTo(30);
    expect(getCronOuterIntervalMinutes(60)).toBe(5);
    const marks = getCronOuterScaleMarks(2.5, 0, 0);
    expect(marks.map((mark) => mark.label)).toContain("5m");
    expect(marks.map((mark) => mark.label)).toContain("1h");
    expect(marks.find((mark) => mark.label === "1h")?.opacity).toBe(0);
    expect(formatCronDurationDisplay(
      (365 + 2 * 30 + 3) * 24 * 60 + 4 * 60 + 5,
    )).toBe("001.02.03 04:05");
    expect(formatCronDate(new Date(2026, 7, 8, 9, 5))).toBe("026.08.08 09:05");
  });

  it("rebuilds a similarly dense scale around the outer pointer", () => {
    const selectedMinutes = 30;
    const pointerAngle = 180;
    const oneHourMarks = getCronOuterScaleMarks(2.5, pointerAngle, selectedMinutes);
    const fiveYearRange = getCronScaleMinutes(357.5);
    const largerScaleMarks = getCronOuterScaleMarks(
      357.5,
      pointerAngle,
      fiveYearRange / 2,
    );
    const oneHourAnchor = oneHourMarks.find((mark) => mark.minutes === selectedMinutes);

    expect(oneHourAnchor?.angle).toBe(pointerAngle);
    expect(oneHourAnchor?.opacity).toBe(1);
    expect(oneHourMarks).toHaveLength(13);
    expect(Math.abs(oneHourMarks.length - largerScaleMarks.length)).toBeLessThanOrEqual(3);
  });

  it("stretches the time scale linearly around its value pointer", () => {
    expect(getCronOuterMarkAngle(0, 120, 180, 30)).toBe(90);
    expect(getCronOuterMarkAngle(15, 120, 180, 30)).toBe(135);
    expect(getCronOuterMarkAngle(30, 120, 180, 30)).toBe(180);
    expect(getCronOuterMarkAngle(60, 120, 180, 30)).toBe(270);
  });

  it("keeps zero at north and the selected mark under a left-side pointer", () => {
    const selectedMinutes = getCronSelectedDurationMinutes(2.5, 240);
    expect(selectedMinutes).toBeCloseTo(20);
    expect(getCronOuterMarkAngle(
      0,
      60,
      240,
      selectedMinutes,
      "counterclockwise",
    )).toBe(360);
    expect(getCronOuterMarkAngle(
      selectedMinutes,
      60,
      240,
      selectedMinutes,
      "counterclockwise",
    )).toBe(240);
    expect(getCronOuterMarkAngle(
      30,
      60,
      240,
      selectedMinutes,
      "counterclockwise",
    )).toBe(180);
  });

  it("returns to the remembered pointer angle and anchors further zoom there", () => {
    expect(getCronZoomedOuterPointer(120, 60, 120, "clockwise")).toBe(60);
    expect(getCronZoomedOuterPointer(120, 60, 60, "clockwise")).toBe(120);
    expect(getCronZoomedOuterPointer(120, 60, 30, "clockwise")).toBe(120);
    expect(getCronZoomedOuterPointer(240, 60, 120, "counterclockwise")).toBe(300);
    expect(getCronZoomedOuterPointer(240, 60, 30, "counterclockwise")).toBe(240);
  });
});
