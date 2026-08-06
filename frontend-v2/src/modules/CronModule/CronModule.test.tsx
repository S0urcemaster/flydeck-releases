import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CronModule } from "./CronModule";

describe("CronModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(<CronModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Cron module"');
    expect(markup).toContain('aria-label="Cron dialer"');
    expect(markup).not.toContain('aria-label="Color dialer"');
  });
});
