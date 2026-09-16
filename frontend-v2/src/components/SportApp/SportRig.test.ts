import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { defaultSportPose } from "./SportExercise";
import { buildSportRig, groundedSportFigureHeight } from "./SportRig";
import { defaultSportMetrics } from "./SportMetrics";

describe("sport figure rig", () => {
  it("grounds the rotated body and applies keyframe height above the floor", () => {
    for (const pose of [defaultSportPose, { ...defaultSportPose, pitch: 65, roll: 45 }, { ...defaultSportPose, pitch: 65, roll: 45, height: 80 }]) {
      const rig = buildSportRig(pose);
      const rotation = new Euler(pose.pitch * Math.PI / 180, 0, pose.roll * Math.PI / 180);
      const bottom = Math.min(...[
        ...rig.segments.flatMap((segment) => [segment.start, segment.end]),
        ...rig.joints.map((joint) => joint.point),
      ].map((point) => new Vector3(...point).applyEuler(rotation).y));
      expect(bottom + groundedSportFigureHeight(rig, pose)).toBeCloseTo(pose.height / 100);
    }
  });
  it("places anatomical left and right on the correct sides and grounds the feet", () => {
    const rig = buildSportRig(defaultSportPose);
    const leftHip = rig.segments.find((part) => part.color === "#e69c73")!;
    const rightHip = rig.segments.find((part) => part.color === "#ba9ddc")!;
    expect(leftHip.end[0]).toBeGreaterThan(0);
    expect(rightHip.end[0]).toBeLessThan(0);
    const feet = rig.segments.filter((part) => part.color === "#e69c73" || part.color === "#ba9ddc")
      .flatMap((part) => part.radius === .045 ? [part.end] : part.start[2] !== part.end[2] && part.radius === .055 ? [part.end] : []);
    expect(Math.min(...feet.map((point) => point[1] + rig.pelvisHeight))).toBeCloseTo(0);
    const leftFoot = rig.segments.filter((part) => part.color === "#e69c73").at(-1)!;
    expect(leftFoot.end[2]).toBeGreaterThan(leftFoot.start[2]);
  });

  it("keeps a bent squat grounded and separates lower back from upper torso", () => {
    const squat = buildSportRig({ ...defaultSportPose, leftHip: 75, rightHip: 75, leftKnee: 105, rightKnee: 105 });
    expect(squat.pelvisHeight).toBeLessThan(buildSportRig(defaultSportPose).pelvisHeight);
    const lower = buildSportRig({ ...defaultSportPose, lowerSpine: 45 });
    const upper = buildSportRig({ ...defaultSportPose, spine: 45 });
    expect(lower.segments[0].end[2]).toBeGreaterThan(0);
    expect(upper.segments[0].end[2]).toBe(0);
    expect(upper.segments[1].end[2]).toBeGreaterThan(0);
  });

  it("keeps both shoulder axes and the elbow hinge in one arm chain", () => {
    const leftArm = (values: Record<string, number>) => buildSportRig({ ...defaultSportPose, ...values }).segments
      .filter((part) => part.color === "#75c5b3");
    const neutral = leftArm({});
    const forward = leftArm({ leftShoulder: 60 });
    const sideways = leftArm({ leftShoulderSide: 60 });
    const bent = leftArm({ leftElbow: 90 });
    expect(forward[1].end[2]).toBeGreaterThan(neutral[1].end[2]);
    expect(sideways[1].end[0]).toBeGreaterThan(neutral[1].end[0]);
    expect(sideways[2].end[0]).toBeGreaterThan(neutral[2].end[0]);
    expect(bent[2].end[2]).toBeGreaterThan(bent[2].start[2]);
    const length = (part: typeof neutral[number]) => Math.hypot(
      part.end[0] - part.start[0], part.end[1] - part.start[1], part.end[2] - part.start[2],
    );
    expect(length(leftArm({ leftShoulder: 60, leftShoulderSide: 60 })[1])).toBeCloseTo(.47);
  });

  it("rotates each bent forearm around its fixed upper-arm axis", () => {
    for (const [side, color] of [["left", "#75c5b3"], ["right", "#87aee0"]] as const) {
      const neutral = buildSportRig({ ...defaultSportPose, [`${side}Elbow`]: 90 }).segments.filter((part) => part.color === color);
      const turned = buildSportRig({ ...defaultSportPose, [`${side}Elbow`]: 90, [`${side}ShoulderTurn`]: 75 }).segments.filter((part) => part.color === color);
      expect(turned[1].start).toEqual(neutral[1].start);
      expect(turned[1].end).toEqual(neutral[1].end);
      expect(turned[2].start).toEqual(neutral[2].start);
      expect(turned[2].end[0]).not.toBeCloseTo(neutral[2].end[0]);
      expect(Math.hypot(...turned[2].end.map((value, index) => value - turned[2].start[index]))).toBeCloseTo(.43);
    }
  });

  it("moves each foot with its ankle and keeps the lowest contact grounded", () => {
    const leftFoot = (ankle: number) => {
      const rig = buildSportRig({ ...defaultSportPose, leftAnkle: ankle });
      const parts = rig.segments.filter((part) => part.color === "#e69c73");
      return { rig, heel: parts[3].end, toe: parts[4].end };
    };
    const neutral = leftFoot(0);
    const raised = leftFoot(30);
    const lowered = leftFoot(-30);
    expect(raised.toe[1] - raised.heel[1]).toBeGreaterThan(neutral.toe[1] - neutral.heel[1]);
    expect(lowered.toe[1] - lowered.heel[1]).toBeLessThan(neutral.toe[1] - neutral.heel[1]);
    expect(Math.min(raised.heel[1], raised.toe[1]) + raised.rig.pelvisHeight).toBeCloseTo(0);
    expect(Math.min(lowered.heel[1], lowered.toe[1]) + lowered.rig.pelvisHeight).toBeCloseTo(0);
  });

  it("rotates the foot with the lower leg around the lower-leg axis", () => {
    const foot = (turn: number) => buildSportRig({ ...defaultSportPose, leftKnee: 45, leftKneeTurn: turn }).segments.filter((part) => part.color === "#e69c73");
    const neutral = foot(0);
    const turned = foot(60);
    expect(turned[2].end).toEqual(neutral[2].end);
    expect(turned[4].end[0]).not.toBeCloseTo(neutral[4].end[0]);
    expect(Math.hypot(...turned[4].end.map((value, index) => value - turned[4].start[index]))).toBeCloseTo(
      Math.hypot(...neutral[4].end.map((value, index) => value - neutral[4].start[index])),
    );
    const footDirection = turned[4].end.map((value, index) => value - turned[4].start[index]);
    expect(turned[4].normal).toBeDefined();
    expect(Math.hypot(...turned[4].normal!)).toBeCloseTo(1);
    expect(footDirection.reduce((sum, value, index) => sum + value * turned[4].normal![index], 0)).toBeCloseTo(0);
    expect(turned[4].normal).toEqual(neutral[4].normal);
  });

  it("tilts the neck and head independently and attaches palms beyond the wrists", () => {
    const neutral = buildSportRig(defaultSportPose);
    const neck = buildSportRig({ ...defaultSportPose, head: 30 });
    const tiltedHead = buildSportRig({ ...defaultSportPose, headTilt: 30 });
    const sideTiltedHead = buildSportRig({ ...defaultSportPose, headSideTilt: 30 });
    expect(neck.segments[2].end[2]).toBeGreaterThan(neutral.segments[2].end[2]);
    expect(tiltedHead.segments[2].end).toEqual(neutral.segments[2].end);
    expect(tiltedHead.joints[3].point[2]).toBeGreaterThan(neutral.joints[3].point[2]);
    expect(sideTiltedHead.joints[3].point[0]).toBeGreaterThan(neutral.joints[3].point[0]);
    const wrist = neutral.segments.filter((part) => part.color === "#75c5b3")[2].end;
    const palm = neutral.joints.find((joint) => joint.shape === "hand" && joint.color === "#75c5b3")!;
    expect(palm.point).toEqual(wrist);
    expect(Math.hypot(...palm.direction!)).toBeCloseTo(.43);
  });

  it("shortens the neck and turns the head, hands and upper torso independently", () => {
    const neutral = buildSportRig(defaultSportPose);
    expect(Math.hypot(...neutral.segments[2].end.map((value, axis) => value - neutral.segments[2].start[axis]))).toBeCloseTo(.145);
    const head = buildSportRig({ ...defaultSportPose, headTurn: 45 });
    expect(head.joints[3].turn).toBe(45);
    expect(head.segments[2].end).toEqual(neutral.segments[2].end);
    const wrist = buildSportRig({ ...defaultSportPose, leftHandFlex: 40, leftElbowTurn: 90 });
    const neutralPalm = neutral.joints.find((joint) => joint.shape === "hand" && joint.color === "#75c5b3")!;
    const bentPalm = wrist.joints.find((joint) => joint.shape === "hand" && joint.color === "#75c5b3")!;
    const fixedWrist = neutral.joints.find((joint) => joint.color === "#75c5b3" && joint.radius === .055)!;
    const bentWrist = wrist.joints.find((joint) => joint.color === "#75c5b3" && joint.radius === .055)!;
    expect(fixedWrist.point).toEqual(neutral.segments.filter((part) => part.color === "#75c5b3")[2].end);
    expect(bentWrist.point).toEqual(fixedWrist.point);
    expect(neutralPalm.point).toEqual(fixedWrist.point);
    expect(bentPalm.point).toEqual(fixedWrist.point);
    expect(bentPalm.direction).toEqual(neutralPalm.direction);
    expect(bentPalm.bend).toBe(40);
    expect(bentPalm.normal).not.toEqual(neutralPalm.normal);
    const shoulderTwist = buildSportRig({ ...defaultSportPose, leftElbow: 90, leftShoulderTurn: 70 });
    const twistedPalm = shoulderTwist.joints.find((joint) => joint.shape === "hand" && joint.color === "#75c5b3")!;
    const untwistedPalm = buildSportRig({ ...defaultSportPose, leftElbow: 90 }).joints.find((joint) => joint.shape === "hand" && joint.color === "#75c5b3")!;
    expect(twistedPalm.normal).not.toEqual(untwistedPalm.normal);
    expect(twistedPalm.direction!.reduce((sum, value, axis) => sum + value * twistedPalm.normal![axis], 0)).toBeCloseTo(0);
    const twisted = buildSportRig({ ...defaultSportPose, torsoTurn: 90 });
    expect(twisted.joints[3].turn).toBe(90);
    const neutralShoulder = neutral.segments.filter((part) => part.color === "#75c5b3")[0].end;
    const twistedShoulder = twisted.segments.filter((part) => part.color === "#75c5b3")[0].end;
    expect(twistedShoulder[2]).toBeLessThan(neutralShoulder[2]);
    expect(twisted.segments[0]).toEqual(neutral.segments[0]);
    expect(twisted.joints[0]).toEqual(neutral.joints[0]);
  });

  it("applies body dimensions to the matching parts and puts both thumbs inside", () => {
    const neutral = buildSportRig(defaultSportPose);
    const arm = buildSportRig(defaultSportPose, { ...defaultSportMetrics, upperArm: 40, lowerArm: 35 });
    const leg = buildSportRig(defaultSportPose, { ...defaultSportMetrics, upperLeg: 55, lowerLeg: 50 });
    const torso = buildSportRig(defaultSportPose, { ...defaultSportMetrics, hipShoulder: 70 });
    const wide = buildSportRig(defaultSportPose, { ...defaultSportMetrics, shoulderWidth: 55, hipWidth: 42 });
    const tall = buildSportRig(defaultSportPose, { ...defaultSportMetrics, bodyHeight: 200 });
    const left = (rig: ReturnType<typeof buildSportRig>, color: string) => rig.segments.filter((part) => part.color === color);
    expect(left(arm, "#75c5b3")[1].end[1]).toBeLessThan(left(neutral, "#75c5b3")[1].end[1]);
    expect(left(arm, "#75c5b3")[2].end[1]).toBeLessThan(left(neutral, "#75c5b3")[2].end[1]);
    expect(left(leg, "#e69c73")[1].end[1]).toBeLessThan(left(neutral, "#e69c73")[1].end[1]);
    expect(left(leg, "#e69c73")[2].end[1]).toBeLessThan(left(neutral, "#e69c73")[2].end[1]);
    expect(torso.segments[1].end[1]).toBeGreaterThan(neutral.segments[1].end[1]);
    expect(left(wide, "#75c5b3")[0].end[0]).toBeGreaterThan(left(neutral, "#75c5b3")[0].end[0]);
    expect(left(wide, "#e69c73")[0].end[0]).toBeGreaterThan(left(neutral, "#e69c73")[0].end[0]);
    expect(tall.pelvisHeight).toBeGreaterThan(neutral.pelvisHeight);
    expect(neutral.joints.find((joint) => joint.shape === "hand" && joint.color === "#75c5b3")?.thumbSide).toBe(-1);
    expect(neutral.joints.find((joint) => joint.shape === "hand" && joint.color === "#87aee0")?.thumbSide).toBe(1);
  });
});
