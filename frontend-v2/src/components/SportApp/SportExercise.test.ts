import { describe, expect, it } from "vitest";
import {
  addSportKeyframe, createSportExercise, defaultSportPose, deleteSportKeyframe,
  changeSportPoseAxis, mirrorSportLimb, moveSportKeyframe, parseSportExercise,
} from "./SportExercise";

describe("sport exercise content", () => {
  it("starts every new exercise with one complete pose", () => {
    const exercise = createSportExercise();
    expect(exercise.keyframes).toHaveLength(1);
    expect(exercise.keyframes[0].values.yaw).toBe(0);
    expect(exercise.keyframes[0].values.height).toBe(0);
    expect(exercise.keyframes[0].values.viewAngle).toBe(0);
    expect(exercise.keyframes[0].values.viewHeight).toBe(1.95);
    expect(exercise.keyframes[0].values.viewZoom).toBe(100);
    expect(exercise.comment).toBe("");
    expect(exercise.secondsPerKeyframe).toBe(1.2);
    expect(parseSportExercise(JSON.stringify(exercise))).toEqual(exercise);
  });

  it("keeps at least one pose while adding, moving and deleting keyframes", () => {
    const first = createSportExercise();
    expect(deleteSportKeyframe(first, 0)).toBe(first);
    const second = addSportKeyframe(first, 0);
    expect(second.keyframes).toHaveLength(2);
    expect(second.keyframes[1].values).toEqual(first.keyframes[0].values);
    const moved = moveSportKeyframe(second, 1, -1);
    expect(moved.keyframes[0].id).toBe(second.keyframes[1].id);
    expect(deleteSportKeyframe(moved, 0).keyframes[0].id).toBe(first.keyframes[0].id);
  });

  it("rejects malformed or empty keyframe content", () => {
    expect(parseSportExercise("{}")).toBeNull();
    expect(parseSportExercise(JSON.stringify({ schema: "flydeck.sport.exercise/v1", keyframes: [] }))).toBeNull();
  });

  it("keeps a comment and reads older exercise items without one", () => {
    const exercise = createSportExercise();
    exercise.comment = "Keep knees over feet";
    expect(parseSportExercise(JSON.stringify(exercise))?.comment).toBe(exercise.comment);
    const oldValues = Object.fromEntries(Object.entries(exercise.keyframes[0].values).filter(([key]) => !["viewAngle", "viewHeight", "viewZoom", "x", "y", "height", "lowerSpine", "headTilt", "headSideTilt", "headTurn", "torsoTurn", "leftShoulderHeight", "leftShoulderForward", "rightShoulderHeight", "rightShoulderForward", "leftShoulderTurn", "rightShoulderTurn", "leftKneeTurn", "rightKneeTurn", "leftHandFlex", "leftElbowTurn", "rightHandFlex", "rightElbowTurn"].includes(key)));
    const oldContent = { ...exercise, comment: undefined, secondsPerKeyframe: undefined, keyframes: [{ id: exercise.keyframes[0].id, label: "Stand", values: oldValues }] };
    expect(parseSportExercise(JSON.stringify(oldContent))?.comment).toBe("");
    expect(parseSportExercise(JSON.stringify(oldContent))?.secondsPerKeyframe).toBe(1.2);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.lowerSpine).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.height).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.x).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.y).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.viewHeight).toBe(1.95);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.leftShoulderTurn).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.rightShoulderTurn).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.leftKneeTurn).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.headTilt).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.headSideTilt).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.torsoTurn).toBe(0);
    expect(parseSportExercise(JSON.stringify(oldContent))?.keyframes[0].values.leftHandFlex).toBe(0);
    const legacyHandTurn = { ...oldContent, keyframes: [{ id: oldContent.keyframes[0].id, values: { ...oldValues, leftHandTurn: 55 } }] };
    expect(parseSportExercise(JSON.stringify(legacyHandTurn))?.keyframes[0].values.leftElbowTurn).toBe(55);
    const legacyZoom = { ...oldContent, keyframes: [{ id: oldContent.keyframes[0].id, values: { ...oldValues, zoom: 150 } }] };
    expect(parseSportExercise(JSON.stringify(legacyZoom))?.keyframes[0].values.zoom).toBe(150);
    const withoutFurniture: Partial<typeof oldContent> = { ...oldContent };
    delete withoutFurniture.furniture;
    expect(parseSportExercise(JSON.stringify(withoutFurniture))?.furniture).toEqual(createSportExercise().furniture);
  });

  it("stores furniture once per exercise rather than in its keyframes", () => {
    const exercise = createSportExercise();
    exercise.furniture.table.enabled = true;
    exercise.furniture.bench.backrest = 45;
    exercise.furniture.wallBar = { enabled: true, x: .5, y: 2, length: 3.5, color: "#b28a68" };
    exercise.furniture.plant.enabled = true;
    exercise.furniture.table.height = .95;
    exercise.furniture.mat.width = 1.4;
    exercise.furniture.poster.z = 1.2;
    const withFrame = addSportKeyframe(exercise, 0);
    expect(withFrame.furniture).toEqual(exercise.furniture);
    expect(withFrame.keyframes[0].values).not.toHaveProperty("furniture");
    expect(parseSportExercise(JSON.stringify(withFrame))?.furniture.bench.backrest).toBe(45);
    expect(parseSportExercise(JSON.stringify(withFrame))?.furniture.wallBar.length).toBe(3.5);
    expect(parseSportExercise(JSON.stringify(withFrame))?.furniture.plant.enabled).toBe(true);
    expect(parseSportExercise(JSON.stringify(withFrame))?.furniture.table.height).toBe(.95);
    expect(parseSportExercise(JSON.stringify(withFrame))?.furniture.mat.width).toBe(1.4);
    expect(parseSportExercise(JSON.stringify(withFrame))?.furniture.poster.z).toBe(1.2);
    const legacy = { ...exercise, furniture: { ...exercise.furniture, wallBar: true, plant: undefined } };
    expect(parseSportExercise(JSON.stringify(legacy))?.furniture.wallBar.enabled).toBe(true);
    expect(parseSportExercise(JSON.stringify(legacy))?.furniture.mat.enabled).toBe(true);
  });

  it("copies the left limb when symmetry starts and keeps either side linked", () => {
    const pose = { ...defaultSportPose, leftShoulderHeight: 7, rightShoulderHeight: -2, leftElbow: 70, rightElbow: 10, leftKnee: 80, rightKnee: 20 };
    expect(mirrorSportLimb(pose, "arm").rightElbow).toBe(70);
    expect(mirrorSportLimb(pose, "arm").rightShoulderHeight).toBe(7);
    expect(mirrorSportLimb(pose, "leg").rightKnee).toBe(80);
    expect(changeSportPoseAxis(pose, "rightElbow", 45, true, false).leftElbow).toBe(45);
    expect(changeSportPoseAxis(pose, "rightShoulderForward", 6, true, false).leftShoulderForward).toBe(6);
    expect(changeSportPoseAxis(pose, "leftKneeTurn", 35, false, true).rightKneeTurn).toBe(35);
  });
});
