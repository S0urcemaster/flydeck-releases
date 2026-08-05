import { describe, expect, it } from "vitest";

import { formatDeviceInfo } from "./deviceInfo";

describe("DeviceInfo", () => {
  it("formats client information as readable JSON", () => {
    expect(formatDeviceInfo({ viewport: { width: 412 } })).toBe(
      '{\n  "viewport": {\n    "width": 412\n  }\n}',
    );
  });
});
