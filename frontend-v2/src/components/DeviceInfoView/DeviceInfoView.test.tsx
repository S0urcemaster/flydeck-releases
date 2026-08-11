import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeviceInfoView } from "./DeviceInfoView";

describe("DeviceInfoView", () => {
  it("composes AppView and DeviceInfo", () => {
    const markup = renderToStaticMarkup(<DeviceInfoView />);

    expect(markup).toContain('data-component-name="DeviceInfoView"');
    expect(markup).toContain("DEVICEINFO");
    expect(markup).toContain('data-component-name="DeviceInfo"');
    expect(markup).toContain('aria-label="DeviceInfo result"');
  });
});
