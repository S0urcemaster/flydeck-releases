import { describe, expect, it } from "vitest";
import { getPreferredCustomKeyboard } from "./Editor";

describe("getPreferredCustomKeyboard", () => {
  it("uses the phone keyboard for mobile preference", () => {
    expect(getPreferredCustomKeyboard("mobile")).toBe("mobile");
  });

  it("uses the character dial for dialer and system fallback", () => {
    expect(getPreferredCustomKeyboard("dialer")).toBe("dialer");
    expect(getPreferredCustomKeyboard("system")).toBe("dialer");
  });
});
