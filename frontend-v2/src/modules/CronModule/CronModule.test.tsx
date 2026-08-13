import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CronModule } from "./CronModule";

describe("CronModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(<CronModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Cron module"');
    expect(markup).toContain('aria-label="Cron dialer"');
    expect(markup).toContain(">SCALE</button>");
    expect(markup).toContain(">SEND</button>");
    expect(markup).toContain(">RANGE</button>");
    expect(markup).toContain(">ZOOM</button>");
    expect(markup.match(/data-component-name="DialerButton"/g)).toHaveLength(4);
    expect(markup.match(/data-component-name="DialerCenterButton"/g)).toHaveLength(1);
  });
});
