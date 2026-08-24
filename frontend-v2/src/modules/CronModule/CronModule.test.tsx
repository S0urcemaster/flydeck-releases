import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CronModule } from "./CronModule";

describe("CronModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(<CronModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Cron module"');
    expect(markup).toContain('aria-label="Cron timeline"');
    expect(markup).toContain('data-component-name="CronDialer"');
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain('aria-label="Set start"');
    expect(markup).toContain('aria-label="Set end"');
    expect(markup).toContain('aria-label="Create event at ');
    expect(markup).not.toContain('data-component-name="DialerButton"');
  });
});
