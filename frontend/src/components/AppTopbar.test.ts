import { describe, expect, it } from "vitest";
import { getAppStatus } from "./AppTopbar";

describe("getAppStatus", () => {
  it("prioritizes active errors", () => {
    expect(getAppStatus({
      activeError: "broken",
      serverVital: true,
      chatBusy: false,
      chatRun: null,
    })).toEqual({ message: "Flydon: broken", isError: true });
  });

  it("reports completed agent responses", () => {
    const status = getAppStatus({
      activeError: null,
      serverVital: true,
      chatBusy: false,
      chatRun: {
        id: "run",
        status: "completed",
        prompt: "hello",
        output: "world",
        error: null,
        createdAt: "",
        updatedAt: "",
      },
    });
    expect(status).toEqual({
      message: "Flydon has responded · last chat run status: completed",
      isError: false,
    });
  });
});
