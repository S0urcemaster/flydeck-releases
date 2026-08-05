import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeviceInfo } from "./DeviceInfo";

describe("DeviceInfo", () => {
  it("renders its refresh action and result control", () => {
    const markup = renderToStaticMarkup(
      <DeviceInfo buttonProps={{ width: "77px" }} />,
    );

    expect(markup).toContain('aria-label="Device information"');
    expect(markup).toContain("DEVICEINFO");
    expect(markup).toContain("width:77px");
    expect(markup).toContain('data-component-name="DeviceInfoButton"');
    expect(markup).toContain('aria-label="DeviceInfo result"');
  });
});
