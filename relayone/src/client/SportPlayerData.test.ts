import { describe, expect, it } from "vitest";
import { defaultSportPose, interpolateSportPose, isSportExerciseContent, parseSportExercise } from "./SportPlayerData";

const exercise = {
  schema: "flydeck.sport.exercise/v1",
  comment: "Keep moving",
  keyframes: [
    { id: "one", values: { ...defaultSportPose, leftElbow: 0 } },
    { id: "two", values: { ...defaultSportPose, leftElbow: 100 } },
  ],
};

describe("Relay One sport player data", () => {
  it("recognizes and normalizes the Flydeck exercise format", () => {
    const content = JSON.stringify(exercise);
    expect(isSportExerciseContent(content)).toBe(true);
    const parsed = parseSportExercise(content)!;
    expect(parsed.comment).toBe("Keep moving");
    expect(parsed.secondsPerKeyframe).toBe(1.2);
    expect(parsed.furniture.dumbbells).toBe(false);
    expect(parsed.furniture.wallBar.enabled).toBe(false);
    expect(parsed.furniture.mat.width).toBe(1);
    expect(parsed.furniture.poster.enabled).toBe(true);
    expect(parsed.furniture.table.color).toBe("#9a7256");
    expect(parsed.metrics.bodyHeight).toBe(180);
    const legacy = { ...exercise, keyframes: [{ id: "old", values: { ...defaultSportPose, leftElbowTurn: undefined, leftHandTurn: 45 } }] };
    expect(parseSportExercise(JSON.stringify(legacy))?.keyframes[0].values.leftElbowTurn).toBe(45);
  });

  it("interpolates the closing transition without a hard loop cut", () => {
    const animatedView = { ...exercise, keyframes: [exercise.keyframes[0], { ...exercise.keyframes[1], values: { ...exercise.keyframes[1].values, viewAngle: 90, viewHeight: 2.5, viewZoom: 150 } }] };
    const parsed = parseSportExercise(JSON.stringify(animatedView))!;
    expect(interpolateSportPose(parsed.keyframes, 1).leftElbow).toBe(100);
    expect(interpolateSportPose(parsed.keyframes, 1.5).leftElbow).toBe(50);
    expect(interpolateSportPose(parsed.keyframes, .5).viewAngle).toBe(45);
    expect(interpolateSportPose(parsed.keyframes, .5).viewHeight).toBeCloseTo(2.225);
    expect(interpolateSportPose(parsed.keyframes, .5).viewZoom).toBe(125);
    expect(interpolateSportPose(parsed.keyframes, 2).leftElbow).toBe(0);
  });

  it("rejects malformed content", () => {
    expect(parseSportExercise("{}")).toBeNull();
  });
});
