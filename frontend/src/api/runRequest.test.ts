import { describe, expect, it, vi } from "vitest";
import { runRequest } from "./runRequest";

describe("runRequest", () => {
  it("manages the successful request lifecycle", async () => {
    const states: boolean[] = [];
    const errors: Array<string | null> = [];
    const result = await runRequest(async () => undefined, {
      setBusy: (value) => states.push(value as boolean),
      setError: (value) => errors.push(value as string | null),
      fallbackError: "failed",
    });

    expect(result).toBe(true);
    expect(states).toEqual([true, false]);
    expect(errors).toEqual([null]);
  });

  it("normalizes unknown failures and always clears busy", async () => {
    const setBusy = vi.fn();
    const setError = vi.fn();
    const result = await runRequest(async () => { throw "offline"; }, {
      setBusy,
      setError,
      fallbackError: "Request failed",
    });

    expect(result).toBe(false);
    expect(setBusy).toHaveBeenNthCalledWith(1, true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(setError).toHaveBeenLastCalledWith("Request failed");
  });
});
