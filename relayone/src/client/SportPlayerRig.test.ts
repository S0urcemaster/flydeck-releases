import { describe, expect, it } from "vitest";
import { defaultSportPose } from "./SportPlayerData";
import { buildRig } from "./SportPlayerRig";

describe("Relay One sport rig", () => {
  it("moves the shoulder around a fixed chest pivot", () => {
    const arm = (pose: Record<string, number>) => buildRig({ ...defaultSportPose, ...pose }).segments.filter((part) => part.color === 0x75c5b3);
    const neutral = arm({})[0]; const moved = arm({ leftShoulderHeight: 12, leftShoulderForward: 10 })[0];
    const length = (part: typeof neutral) => Math.hypot(...part.end.map((value, index) => value - part.start[index]));
    expect(length(moved)).toBeCloseTo(length(neutral));
    expect(moved.end[1]).toBeGreaterThan(neutral.end[1]);
    expect(moved.end[2]).toBeGreaterThan(neutral.end[2]);
  });

  it("mirrors shoulder and elbow rotation anatomically", () => {
    const rig = buildRig({ ...defaultSportPose, leftShoulder: 75, rightShoulder: 75, leftShoulderSide: 15, rightShoulderSide: 15, leftElbow: 80, rightElbow: 80, leftShoulderTurn: 45, rightShoulderTurn: 45, leftElbowTurn: -65, rightElbowTurn: -65 });
    const left = rig.joints.find((joint) => joint.shape === "hand" && joint.color === 0x75c5b3)!;
    const right = rig.joints.find((joint) => joint.shape === "hand" && joint.color === 0x87aee0)!;
    expect(left.normal?.[0]).toBeCloseTo(right.normal![0]);
    expect(left.normal?.[1]).toBeCloseTo(-right.normal![1]);
    expect(left.normal?.[2]).toBeCloseTo(-right.normal![2]);
  });
});
