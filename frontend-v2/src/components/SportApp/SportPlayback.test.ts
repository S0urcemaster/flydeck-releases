import { describe, expect, it } from "vitest";
import { advanceSportPlayback, interpolateSportPose } from "./SportPlayback";

describe("sport playback", () => {
  it("stops on the final frame when looping is off", () => {
    expect(advanceSportPlayback(1.99, 2, .02, false)).toEqual({ progress: 2, ended: true, looped: false });
  });

  it("wraps past the final frame when looping is on", () => {
    const result = advanceSportPlayback(1.99, 2, .02, true);
    expect(result.progress).toBeCloseTo(.01);
    expect(result).toMatchObject({ ended: false, looped: true });
  });

  it("interpolates from the last keyframe back to the first", () => {
    const poses = [{ values: { angle: 0 } }, { values: { angle: 60 } }, { values: { angle: 120 } }];
    expect(interpolateSportPose(poses, 2, ["angle"]).angle).toBe(120);
    expect(interpolateSportPose(poses, 2.5, ["angle"]).angle).toBe(60);
    expect(interpolateSportPose(poses, 3, ["angle"]).angle).toBe(0);
  });
});
