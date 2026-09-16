import type { SportMetrics, SportPose } from "./SportPlayerData";
import { defaultSportMetrics } from "./SportPlayerData";

export type Point = [number, number, number];
export type Segment = { start: Point; end: Point; color: number; radius: number; shape?: "ellipsoid"; profile?: "foot"; normal?: Point; upper?: boolean };
export type Joint = { point: Point; color: number; radius: number; shape?: "head" | "hand"; direction?: Point; normal?: Point; turn?: number; bend?: number; thumbSide?: number; upper?: boolean };
export type Rig = { segments: Segment[]; joints: Joint[] };

const colors = { torso: 0xd6af73, leftArm: 0x75c5b3, rightArm: 0x87aee0, leftLeg: 0xe69c73, rightLeg: 0xba9ddc, skin: 0xf4dcc0 };
const radians = (value: number) => value * Math.PI / 180;
const down = ([x, y, z]: Point, length: number, forward: number, side: number): Point => [x + Math.sin(radians(side)) * length, y - Math.cos(radians(forward)) * Math.cos(radians(side)) * length, z + Math.sin(radians(forward)) * length];
const arm = ([x, y, z]: Point, length: number, forward: number, abduction: number, sign: number): Point => {
  const forwardAngle = radians(forward); const sideAngle = radians(sign * (18 + abduction));
  return [x + Math.sin(sideAngle) * Math.cos(forwardAngle) * length, y - Math.cos(sideAngle) * Math.cos(forwardAngle) * length, z + Math.sin(forwardAngle) * length];
};
const up = ([x, y, z]: Point, length: number, forward: number): Point => [x, y + Math.cos(radians(forward)) * length, z + Math.sin(radians(forward)) * length];
const sole = ([x, y, z]: Point, offset: number, shin: number, ankle: number): Point => {
  const pitch = radians(-(shin + ankle)); const soleHeight = -.075;
  return [x, y + soleHeight * Math.cos(pitch) - offset * Math.sin(pitch), z + soleHeight * Math.sin(pitch) + offset * Math.cos(pitch)];
};
const soleNormal = (shin: number, ankle: number): Point => { const pitch = radians(-(shin + ankle)); return [0, Math.cos(pitch), Math.sin(pitch)]; };
const rotateAxis = (point: Point, pivot: Point, axisPoint: Point, angle: number): Point => {
  if (!angle) return point;
  const axis = pivot.map((value, index) => value - axisPoint[index]) as Point; const length = Math.hypot(...axis);
  const [ax, ay, az] = axis.map((value) => value / length); const [x, y, z] = point.map((value, index) => value - pivot[index]);
  const rotation = radians(angle); const cosine = Math.cos(rotation); const sine = Math.sin(rotation); const along = ax * x + ay * y + az * z;
  return [pivot[0] + x * cosine + (ay * z - az * y) * sine + ax * along * (1 - cosine), pivot[1] + y * cosine + (az * x - ax * z) * sine + ay * along * (1 - cosine), pivot[2] + z * cosine + (ax * y - ay * x) * sine + az * along * (1 - cosine)];
};
const turn = ([x, y, z]: Point, [px, py, pz]: Point, angle: number): Point => {
  const rotation = radians(angle); const dx = x - px; const dz = z - pz;
  return [px + dx * Math.cos(rotation) + dz * Math.sin(rotation), py + (y - py), pz - dx * Math.sin(rotation) + dz * Math.cos(rotation)];
};

export function buildRig(pose: SportPose, metrics: SportMetrics = defaultSportMetrics): Rig {
  const pelvis: Point = [0, 0, 0]; const torsoRatio = metrics.hipShoulder / defaultSportMetrics.hipShoulder;
  const waist = up(pelvis, .29 * torsoRatio, pose.lowerSpine); const upperBend = pose.lowerSpine + pose.spine;
  const chest = up(waist, .43 * torsoRatio, upperBend); const neckAngle = upperBend + pose.head;
  const neck = up(chest, .145, neckAngle); const headAngle = neckAngle + pose.headTilt; const headSide = radians(pose.headSideTilt);
  const headCenter: Point = [neck[0] + Math.sin(headSide) * .16, neck[1] + Math.cos(radians(headAngle)) * Math.cos(headSide) * .16, neck[2] + Math.sin(radians(headAngle)) * Math.cos(headSide) * .16];
  const headDirection = headCenter.map((value, axis) => value - neck[axis]) as Point;
  const segments: Segment[] = [
    { start: pelvis, end: waist, color: colors.torso, radius: .15, shape: "ellipsoid" },
    { start: waist, end: chest, color: colors.torso, radius: .19, shape: "ellipsoid", upper: true },
    { start: chest, end: neck, color: colors.skin, radius: .04, upper: true },
  ];
  const joints: Joint[] = [
    { point: pelvis, color: colors.torso, radius: .09 }, { point: waist, color: colors.torso, radius: .08 },
    { point: chest, color: colors.torso, radius: .08, upper: true },
    { point: headCenter, color: colors.skin, radius: .15, shape: "head", direction: headDirection, turn: pose.headTurn, upper: true },
  ];
  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? 1 : -1; const armColor = side === "left" ? colors.leftArm : colors.rightArm; const legColor = side === "left" ? colors.leftLeg : colors.rightLeg;
    const shoulder: Point = [chest[0] + sign * .26 * metrics.shoulderWidth / defaultSportMetrics.shoulderWidth, chest[1], chest[2]];
    const shoulderForward = pose[`${side}Shoulder`]; const shoulderSide = pose[`${side}ShoulderSide`];
    const elbow = arm(shoulder, .47 * metrics.upperArm / defaultSportMetrics.upperArm, shoulderForward, shoulderSide, sign);
    const neutralHand = arm(elbow, .43 * metrics.lowerArm / defaultSportMetrics.lowerArm, shoulderForward + pose[`${side}Elbow`], shoulderSide, sign); const shoulderTurn = pose[`${side}ShoulderTurn`];
    const hand = rotateAxis(neutralHand, elbow, shoulder, shoulderTurn);
    const neutralDirection = neutralHand.map((value, axis) => value - elbow[axis]) as Point; const directionLength = Math.hypot(...neutralDirection); const [dx, dy, dz] = neutralDirection.map((value) => value / directionLength);
    let handNormal: Point = [1 - dx * dx, -dx * dy, -dx * dz]; if (Math.hypot(...handNormal) < .000001) handNormal = [0, -dy * dz, 1 - dz * dz]; const normalLength = Math.hypot(...handNormal); handNormal = handNormal.map((value) => value / normalLength) as Point;
    const handNormalPoint = rotateAxis(handNormal.map((value, axis) => value + elbow[axis]) as Point, elbow, shoulder, shoulderTurn); handNormal = handNormalPoint.map((value, axis) => value - elbow[axis]) as Point;
    const forearmNormalPoint = rotateAxis(handNormal.map((value, axis) => value + hand[axis]) as Point, hand, elbow, pose[`${side}ElbowTurn`]); handNormal = forearmNormalPoint.map((value, axis) => value - hand[axis]) as Point;
    const hip: Point = [pelvis[0] + sign * .15 * metrics.hipWidth / defaultSportMetrics.hipWidth, 0, 0];
    const knee = down(hip, .55 * metrics.upperLeg / defaultSportMetrics.upperLeg, pose[`${side}Hip`], sign * pose[`${side}HipSide`]);
    const shin = pose[`${side}Hip`] - pose[`${side}Knee`]; const ankle = down(knee, .53 * metrics.lowerLeg / defaultSportMetrics.lowerLeg, shin, 0);
    const kneeTurn = sign * pose[`${side}KneeTurn`];
    const heel = rotateAxis(sole(ankle, -.13, shin, pose[`${side}Ankle`]), ankle, knee, kneeTurn);
    const toe = rotateAxis(sole(ankle, .25, shin, pose[`${side}Ankle`]), ankle, knee, kneeTurn);
    const neutralNormal = soleNormal(shin, pose[`${side}Ankle`]); const normalPoint = rotateAxis(neutralNormal.map((value, axis) => value + ankle[axis]) as Point, ankle, knee, kneeTurn); const footNormal = normalPoint.map((value, axis) => value - ankle[axis]) as Point;
    segments.push({ start: chest, end: shoulder, color: armColor, radius: .055, upper: true }, { start: shoulder, end: elbow, color: armColor, radius: .055, upper: true }, { start: elbow, end: hand, color: armColor, radius: .045, upper: true }, { start: pelvis, end: hip, color: legColor, radius: .065 }, { start: hip, end: knee, color: legColor, radius: .07 }, { start: knee, end: ankle, color: legColor, radius: .055 }, { start: ankle, end: heel, color: legColor, radius: .045 }, { start: heel, end: toe, color: legColor, radius: .09, shape: "ellipsoid", profile: "foot", normal: footNormal });
    joints.push({ point: shoulder, color: armColor, radius: .075, upper: true }, { point: elbow, color: armColor, radius: .075, upper: true }, { point: hand, color: armColor, radius: .055, upper: true }, { point: hand, color: armColor, radius: .085, shape: "hand", direction: [hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]], normal: handNormal, bend: pose[`${side}HandFlex`], thumbSide: side === "left" ? -1 : 1, upper: true }, { point: hip, color: legColor, radius: .08 }, { point: knee, color: legColor, radius: .08 }, { point: ankle, color: legColor, radius: .08 });
  }
  const ratio = metrics.bodyHeight / defaultSportMetrics.bodyHeight; const size = (point: Point): Point => point.map((value) => value * ratio) as Point;
  return {
    segments: segments.map((part) => ({ ...part, start: size(part.upper ? turn(part.start, waist, pose.torsoTurn) : part.start), end: size(part.upper ? turn(part.end, waist, pose.torsoTurn) : part.end), radius: part.radius * ratio })),
    joints: joints.map((joint) => ({ ...joint, point: size(joint.upper ? turn(joint.point, waist, pose.torsoTurn) : joint.point), direction: joint.direction ? size(joint.upper ? turn(joint.direction, [0, 0, 0], pose.torsoTurn) : joint.direction) : undefined, normal: joint.normal ? size(joint.upper ? turn(joint.normal, [0, 0, 0], pose.torsoTurn) : joint.normal) : undefined, radius: joint.radius * ratio })),
  };
}

export function groundHeight(rig: Rig, pose: SportPose): number {
  const pitch = radians(pose.pitch); const roll = radians(pose.roll);
  const lowest = Math.min(...[...rig.segments.flatMap(({ start, end }) => [start, end]), ...rig.joints.map(({ point }) => point)].map(([x, y, z]) => (x * Math.sin(roll) + y * Math.cos(roll)) * Math.cos(pitch) - z * Math.sin(pitch)));
  return -lowest + Math.max(0, pose.height) / 100;
}
