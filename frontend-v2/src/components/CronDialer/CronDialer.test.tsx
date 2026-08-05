import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CronDialer,
  cronDurationMarks,
  getCronDurationAngle,
  getCronDurationMarkAngle,
} from "./CronDialer";

describe("CronDialer", () => {
  it("specializes Dialer with the cron controls", () => {
    const markup = renderToStaticMarkup(<CronDialer />);

    expect(markup).toContain('aria-label="Cron dialer"');
    expect(markup).toContain(">SCALE</button>");
    expect(markup).toContain(">SEND</button>");
    expect(markup).toContain(">RANGE</button>");
    expect(markup).toContain(">ZOOM</button>");
    expect(markup).toContain(">SET</button>");
    cronDurationMarks.forEach((mark) => {
      expect(markup).toContain(`>${mark}</span>`);
    });
    expect(markup).not.toContain(">0h</span>");
  });

  it("snaps the inner dial to duration marks while keeping north free", () => {
    expect(getCronDurationMarkAngle(0)).toBeCloseTo(18.95);
    expect(getCronDurationMarkAngle(17)).toBeCloseTo(341.05);
    expect(getCronDurationAngle(9)).toBe(getCronDurationMarkAngle(0));
    expect(getCronDurationAngle(29)).toBe(getCronDurationMarkAngle(1));
    expect(getCronDurationAngle(351)).toBe(getCronDurationMarkAngle(17));
    expect(getCronDurationAngle(359)).toBe(getCronDurationMarkAngle(17));
  });
});
