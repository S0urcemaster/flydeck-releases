import type { SportMetrics, SportModelSettings, SportPose } from "./SportPlayerData";
import { defaultSportMetrics, defaultSportModelSettings } from "./SportPlayerData";

export type Point = [number, number, number];
export type Segment = { start: Point; end: Point; color: number; radius: number; shape?: "ellipsoid"; profile?: "foot"; normal?: Point; upper?: boolean };
export type Joint = { point: Point; color: number; radius: number; shape?: "head" | "hand"; direction?: Point; normal?: Point; turn?: number; bend?: number; thumbSide?: number; upper?: boolean };
export type Rig = { segments: Segment[]; joints: Joint[] };

const colors = { torso: 0xd6af73, leftArm: 0x75c5b3, rightArm: 0x87aee0, leftLeg: 0xe69c73, rightLeg: 0xba9ddc, skin: 0xf4dcc0 };
const radians = (value: number) => value * Math.PI / 180;
const softLimit = (value: number, min: number, max: number, enabled: boolean) => value < min && enabled ? min + 5 * Math.tanh((value - min) / 5) : value > max && enabled ? max + 5 * Math.tanh((value - max) / 5) : value;
const down = ([x, y, z]: Point, length: number, forward: number, side: number): Point => [x + Math.sin(radians(side)) * length, y - Math.cos(radians(forward)) * Math.cos(radians(side)) * length, z + Math.sin(radians(forward)) * length];
const arm = ([x, y, z]: Point, length: number, elevation: number, azimuth: number, sign: number): Point => {
  const elevationAngle = radians(elevation); const azimuthAngle = radians(20 + azimuth); const horizontal = Math.sin(elevationAngle) * length;
  return [x + sign * Math.cos(azimuthAngle) * horizontal, y - Math.cos(elevationAngle) * length, z + Math.sin(azimuthAngle) * horizontal];
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

export function buildRig(pose: SportPose, metrics: SportMetrics = defaultSportMetrics, settings: SportModelSettings = defaultSportModelSettings): Rig {
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
    const shoulderRadius = .26 * metrics.shoulderWidth / defaultSportMetrics.shoulderWidth;
    const armElevation = softLimit(pose[`${side}Shoulder`], 0, 180, settings.softJointLimits);
    const rhythm = settings.shoulderRhythm ? Math.max(0, Math.min(15, (armElevation - 90) * 15 / 90)) : 0;
    const shoulderLift = radians((pose[`${side}ShoulderHeight`] ?? 0) + rhythm); const shoulderForward = radians(pose[`${side}ShoulderForward`] ?? 0);
    const shoulder: Point = [chest[0] + sign * shoulderRadius * Math.cos(shoulderLift) * Math.cos(shoulderForward), chest[1] + shoulderRadius * Math.sin(shoulderLift), chest[2] + shoulderRadius * Math.cos(shoulderLift) * Math.sin(shoulderForward)];
    const armAzimuth = pose[`${side}ShoulderSide`];
    const elbow = arm(shoulder, .47 * metrics.upperArm / defaultSportMetrics.upperArm, armElevation, armAzimuth, sign);
    const neutralHand = arm(elbow, .43 * metrics.lowerArm / defaultSportMetrics.lowerArm, armElevation + softLimit(pose[`${side}Elbow`], 0, 145, settings.softJointLimits), armAzimuth, sign);
    const anatomicalShoulderTurn = sign * pose[`${side}ShoulderTurn`]; const hand = rotateAxis(neutralHand, elbow, shoulder, anatomicalShoulderTurn);
    const armAzimuthAngle = radians(20 + armAzimuth); let handNormal: Point = [Math.sin(armAzimuthAngle), 0, -sign * Math.cos(armAzimuthAngle)];
    const handNormalPoint = rotateAxis(handNormal.map((value, axis) => value + elbow[axis]) as Point, elbow, shoulder, anatomicalShoulderTurn); handNormal = handNormalPoint.map((value, axis) => value - elbow[axis]) as Point;
    const anatomicalElbowTurn = sign * pose[`${side}ElbowTurn`]; const forearmNormalPoint = rotateAxis(handNormal.map((value, axis) => value + hand[axis]) as Point, hand, elbow, anatomicalElbowTurn); handNormal = forearmNormalPoint.map((value, axis) => value - hand[axis]) as Point;
    const hip: Point = [pelvis[0] + sign * .15 * metrics.hipWidth / defaultSportMetrics.hipWidth, 0, 0];
    const hipFlex = softLimit(pose[`${side}Hip`], -45, 120, settings.softJointLimits); const hipSide = softLimit(pose[`${side}HipSide`], -50, 50, settings.softJointLimits); const kneeFlex = softLimit(pose[`${side}Knee`], 0, 140, settings.softJointLimits);
    const knee = down(hip, .55 * metrics.upperLeg / defaultSportMetrics.upperLeg, hipFlex, sign * hipSide);
    const shin = hipFlex - kneeFlex; const ankle = down(knee, .53 * metrics.lowerLeg / defaultSportMetrics.lowerLeg, shin, 0);
    const rawKneeTurn = pose[`${side}KneeTurn`]; const turnRange = 5 + 35 * Math.sin(radians(Math.min(90, Math.max(0, kneeFlex)))); const kneeTurn = sign * (settings.kneeRotationLimits ? turnRange * Math.tanh(rawKneeTurn / turnRange) : rawKneeTurn);
    const heel = rotateAxis(sole(ankle, -.13, shin, pose[`${side}Ankle`]), ankle, knee, kneeTurn);
    const toe = rotateAxis(sole(ankle, .25, shin, pose[`${side}Ankle`]), ankle, knee, kneeTurn);
    const neutralNormal = soleNormal(shin, pose[`${side}Ankle`]); const normalPoint = rotateAxis(neutralNormal.map((value, axis) => value + ankle[axis]) as Point, ankle, knee, kneeTurn); const footNormal = normalPoint.map((value, axis) => value - ankle[axis]) as Point;
    segments.push({ start: chest, end: shoulder, color: armColor, radius: .055, upper: true }, { start: shoulder, end: elbow, color: armColor, radius: .055, upper: true }, { start: elbow, end: hand, color: armColor, radius: .045, upper: true }, { start: pelvis, end: hip, color: legColor, radius: .065 }, { start: hip, end: knee, color: legColor, radius: .07 }, { start: knee, end: ankle, color: legColor, radius: .055 }, { start: ankle, end: heel, color: legColor, radius: .045 }, { start: heel, end: toe, color: legColor, radius: .09, shape: "ellipsoid", profile: "foot", normal: footNormal });
    joints.push({ point: shoulder, color: armColor, radius: .075, upper: true }, { point: elbow, color: armColor, radius: .075, upper: true }, { point: hand, color: armColor, radius: .055, upper: true }, { point: hand, color: armColor, radius: .085, shape: "hand", direction: [hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]], normal: handNormal, bend: pose[`${side}HandFlex`], thumbSide: side === "left" ? -1 : 1, upper: true }, { point: hip, color: legColor, radius: .08 }, { point: knee, color: legColor, radius: .08 }, { point: ankle, color: legColor, radius: .08 });
  }
  const ratio = metrics.bodyHeight / defaultSportMetrics.bodyHeight; const size = (point: Point): Point => point.map((value) => value * ratio) as Point;
  return {
    segments: segments.map((part) => ({ ...part, start: size(part.upper ? turn(part.start, waist, pose.torsoTurn) : part.start), end: size(part.upper ? turn(part.end, waist, pose.torsoTurn) : part.end), radius: part.radius * ratio })),
    joints: joints.map((joint) => ({ ...joint, point: size(joint.upper ? turn(joint.point, waist, pose.torsoTurn) : joint.point), direction: joint.direction ? size(joint.upper ? turn(joint.direction, [0, 0, 0], pose.torsoTurn) : joint.direction) : undefined, normal: joint.normal ? size(joint.upper ? turn(joint.normal, [0, 0, 0], pose.torsoTurn) : joint.normal) : undefined, turn: joint.shape === "head" ? (joint.turn ?? 0) + pose.torsoTurn : joint.turn, radius: joint.radius * ratio })),
  };
}

export function groundHeight(rig: Rig, pose: SportPose, settings: SportModelSettings = defaultSportModelSettings): number {
  const pitch = radians(pose.pitch); const roll = radians(pose.roll);
  const lowest = Math.min(...[...rig.segments.flatMap(({ start, end }) => [start, end]), ...rig.joints.map(({ point }) => point)].map(([x, y, z]) => (x * Math.sin(roll) + y * Math.cos(roll)) * Math.cos(pitch) - z * Math.sin(pitch)));
  const lift = Math.max(0, pose.height) / 100;
  if (settings.footContact && Math.abs(pose.pitch) < 45 && Math.abs(pose.roll) < 45) return -Math.min(...rig.segments.filter((part) => part.color === colors.leftLeg || part.color === colors.rightLeg).flatMap((part) => [part.start[1], part.end[1]])) + lift;
  return -lowest + lift;
}
