import { defaultSportMetrics, type SportMetricValues } from "./SportMetrics";
import { sportGroupColors } from "./SportPalette";

export type RigPoint = [number, number, number];
export type RigSegment = { start: RigPoint; end: RigPoint; color: string; radius: number; shape?: "ellipsoid"; profile?: "foot"; normal?: RigPoint; upper?: boolean };
export type RigJoint = { point: RigPoint; color: string; radius: number; shape?: "head" | "hand"; direction?: RigPoint; normal?: RigPoint; turn?: number; bend?: number; thumbSide?: number; upper?: boolean };
export type SportRig = { segments: RigSegment[]; joints: RigJoint[]; pelvisHeight: number };
type Pose = Record<string, number>;

const radians = (value: number) => value * Math.PI / 180;
const down = ([x, y, z]: RigPoint, length: number, forward: number, side: number): RigPoint => [
  x + Math.sin(radians(side)) * length,
  y - Math.cos(radians(forward)) * Math.cos(radians(side)) * length,
  z + Math.sin(radians(forward)) * length,
];
const arm = ([x, y, z]: RigPoint, length: number, elevation: number, azimuth: number, sign: number): RigPoint => {
  const elevationAngle = radians(elevation);
  const azimuthAngle = radians(20 + azimuth);
  const horizontal = Math.sin(elevationAngle) * length;
  return [
    x + sign * Math.cos(azimuthAngle) * horizontal,
    y - Math.cos(elevationAngle) * length,
    z + Math.sin(azimuthAngle) * horizontal,
  ];
};
const up = ([x, y, z]: RigPoint, length: number, forward: number): RigPoint => [
  x,
  y + Math.cos(radians(forward)) * length,
  z + Math.sin(radians(forward)) * length,
];
const solePoint = ([x, y, z]: RigPoint, offset: number, shinForward: number, ankleFlex: number): RigPoint => {
  // Neutral follows the shin; positive ankle flex raises the toes.
  const pitch = radians(-(shinForward + ankleFlex));
  const soleHeight = -.075;
  return [x, y + soleHeight * Math.cos(pitch) - offset * Math.sin(pitch), z + soleHeight * Math.sin(pitch) + offset * Math.cos(pitch)];
};
const soleNormal = (shinForward: number, ankleFlex: number): RigPoint => {
  const pitch = radians(-(shinForward + ankleFlex));
  return [0, Math.cos(pitch), Math.sin(pitch)];
};
const turnPoint = ([x, y, z]: RigPoint, pivot: RigPoint, angle: number): RigPoint => {
  const rotation = radians(angle);
  const dx = x - pivot[0];
  const dz = z - pivot[2];
  return [pivot[0] + dx * Math.cos(rotation) + dz * Math.sin(rotation), y, pivot[2] - dx * Math.sin(rotation) + dz * Math.cos(rotation)];
};
const rotateAroundAxis = (point: RigPoint, pivot: RigPoint, axisPoint: RigPoint, angle: number): RigPoint => {
  if (!angle) return point;
  const axis = pivot.map((value, index) => value - axisPoint[index]) as RigPoint;
  const axisLength = Math.hypot(...axis);
  const [ax, ay, az] = axis.map((value) => value / axisLength);
  const [x, y, z] = point.map((value, index) => value - pivot[index]);
  const rotation = radians(angle);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const alongAxis = ax * x + ay * y + az * z;
  return [
    pivot[0] + x * cosine + (ay * z - az * y) * sine + ax * alongAxis * (1 - cosine),
    pivot[1] + y * cosine + (az * x - ax * z) * sine + ay * alongAxis * (1 - cosine),
    pivot[2] + z * cosine + (ax * y - ay * x) * sine + az * alongAxis * (1 - cosine),
  ];
};

export function buildSportRig(pose: Pose, metrics: SportMetricValues = defaultSportMetrics): SportRig {
  const pelvis: RigPoint = [0, 0, 0];
  const torsoRatio = metrics.hipShoulder / defaultSportMetrics.hipShoulder;
  const waist = up(pelvis, .29 * torsoRatio, pose.lowerSpine ?? 0);
  const upperBend = (pose.lowerSpine ?? 0) + pose.spine;
  const chest = up(waist, .43 * torsoRatio, upperBend);
  const neckAngle = upperBend + pose.head;
  const neck = up(chest, .145, neckAngle);
  const headAngle = neckAngle + (pose.headTilt ?? 0);
  const headSide = radians(pose.headSideTilt ?? 0);
  const headCenter: RigPoint = [
    neck[0] + Math.sin(headSide) * .16,
    neck[1] + Math.cos(radians(headAngle)) * Math.cos(headSide) * .16,
    neck[2] + Math.sin(radians(headAngle)) * Math.cos(headSide) * .16,
  ];
  const headDirection: RigPoint = headCenter.map((value, axis) => value - neck[axis]) as RigPoint;
  const segments: RigSegment[] = [
    { start: pelvis, end: waist, color: sportGroupColors.torso, radius: .15, shape: "ellipsoid" },
    { start: waist, end: chest, color: sportGroupColors.torso, radius: .19, shape: "ellipsoid", upper: true },
    { start: chest, end: neck, color: "#f4dcc0", radius: .04, upper: true },
  ];
  const joints: RigJoint[] = [
    { point: pelvis, color: sportGroupColors.torso, radius: .09 },
    { point: waist, color: sportGroupColors.torso, radius: .08 },
    { point: chest, color: sportGroupColors.torso, radius: .08, upper: true },
    { point: headCenter, color: "#f4dcc0", radius: .15, shape: "head", direction: headDirection, turn: pose.headTurn ?? 0, upper: true },
  ];
  const feet: RigPoint[] = [];
  for (const side of ["left", "right"] as const) {
    // The figure faces +Z. Its anatomical left is on the viewer's right.
    const sign = side === "left" ? 1 : -1;
    const armColor = side === "left" ? sportGroupColors.leftArm : sportGroupColors.rightArm;
    const legColor = side === "left" ? sportGroupColors.leftLeg : sportGroupColors.rightLeg;
    const shoulder: RigPoint = [
      chest[0] + sign * .26 * metrics.shoulderWidth / defaultSportMetrics.shoulderWidth,
      chest[1] + (pose[`${side}ShoulderHeight`] ?? 0) / 100,
      chest[2] + (pose[`${side}ShoulderForward`] ?? 0) / 100,
    ];
    const armElevation = pose[`${side}Shoulder`];
    const armAzimuth = pose[`${side}ShoulderSide`];
    const elbow = arm(shoulder, .47 * metrics.upperArm / defaultSportMetrics.upperArm, armElevation, armAzimuth, sign);
    const neutralHand = arm(elbow, .43 * metrics.lowerArm / defaultSportMetrics.lowerArm, armElevation + pose[`${side}Elbow`], armAzimuth, sign);
    const shoulderTurn = pose[`${side}ShoulderTurn`] ?? 0;
    const anatomicalShoulderTurn = sign * shoulderTurn;
    const hand = rotateAroundAxis(neutralHand, elbow, shoulder, anatomicalShoulderTurn);
    const armAzimuthAngle = radians(20 + armAzimuth);
    let handNormal: RigPoint = [
      Math.sin(armAzimuthAngle),
      0,
      -sign * Math.cos(armAzimuthAngle),
    ];
    const rotatedNormalPoint = rotateAroundAxis(handNormal.map((value, axis) => value + elbow[axis]) as RigPoint, elbow, shoulder, anatomicalShoulderTurn);
    handNormal = rotatedNormalPoint.map((value, axis) => value - elbow[axis]) as RigPoint;
    const anatomicalElbowTurn = sign * (pose[`${side}ElbowTurn`] ?? 0);
    const forearmNormalPoint = rotateAroundAxis(handNormal.map((value, axis) => value + hand[axis]) as RigPoint, hand, elbow, anatomicalElbowTurn);
    handNormal = forearmNormalPoint.map((value, axis) => value - hand[axis]) as RigPoint;
    const hip: RigPoint = [pelvis[0] + sign * .15 * metrics.hipWidth / defaultSportMetrics.hipWidth, pelvis[1], pelvis[2]];
    const knee = down(hip, .55 * metrics.upperLeg / defaultSportMetrics.upperLeg, pose[`${side}Hip`], sign * pose[`${side}HipSide`]);
    const shinForward = pose[`${side}Hip`] - pose[`${side}Knee`];
    const ankle = down(knee, .53 * metrics.lowerLeg / defaultSportMetrics.lowerLeg, shinForward, 0);
    const kneeTurn = sign * (pose[`${side}KneeTurn`] ?? 0);
    const heel = rotateAroundAxis(solePoint(ankle, -.13, shinForward, pose[`${side}Ankle`]), ankle, knee, kneeTurn);
    const toe = rotateAroundAxis(solePoint(ankle, .25, shinForward, pose[`${side}Ankle`]), ankle, knee, kneeTurn);
    const neutralNormal = soleNormal(shinForward, pose[`${side}Ankle`]);
    const normalPoint = rotateAroundAxis(neutralNormal.map((value, axis) => value + ankle[axis]) as RigPoint, ankle, knee, kneeTurn);
    const footNormal = normalPoint.map((value, axis) => value - ankle[axis]) as RigPoint;
    feet.push(heel, toe);
    segments.push(
      { start: chest, end: shoulder, color: armColor, radius: .055, upper: true },
      { start: shoulder, end: elbow, color: armColor, radius: .055, upper: true },
      { start: elbow, end: hand, color: armColor, radius: .045, upper: true },
      { start: pelvis, end: hip, color: legColor, radius: .065 },
      { start: hip, end: knee, color: legColor, radius: .07 },
      { start: knee, end: ankle, color: legColor, radius: .055 },
      { start: ankle, end: heel, color: legColor, radius: .045 },
      { start: heel, end: toe, color: legColor, radius: .09, shape: "ellipsoid", profile: "foot", normal: footNormal },
    );
    joints.push(...[shoulder, elbow].map((point) => ({ point, color: armColor, radius: .075, upper: true })));
    joints.push({ point: hand, color: armColor, radius: .055, upper: true });
    joints.push({ point: hand, color: armColor, radius: .085, shape: "hand", direction: [hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]], normal: handNormal, bend: pose[`${side}HandFlex`] ?? 0, thumbSide: side === "left" ? -1 : 1, upper: true });
    joints.push(...[hip, knee, ankle].map((point) => ({ point, color: legColor, radius: .08 })));
  }
  const torsoTurn = pose.torsoTurn ?? 0;
  const heightRatio = metrics.bodyHeight / defaultSportMetrics.bodyHeight;
  const sizedPoint = (point: RigPoint): RigPoint => point.map((value) => value * heightRatio) as RigPoint;
  return {
    segments: segments.map((part) => ({ ...part,
      start: sizedPoint(part.upper ? turnPoint(part.start, waist, torsoTurn) : part.start),
      end: sizedPoint(part.upper ? turnPoint(part.end, waist, torsoTurn) : part.end),
      radius: part.radius * heightRatio,
    })),
    joints: joints.map((joint) => ({
      ...joint,
      point: sizedPoint(joint.upper ? turnPoint(joint.point, waist, torsoTurn) : joint.point),
      direction: joint.direction ? sizedPoint(joint.upper ? turnPoint(joint.direction, [0, 0, 0], torsoTurn) : joint.direction) : undefined,
      normal: joint.normal ? sizedPoint(joint.upper ? turnPoint(joint.normal, [0, 0, 0], torsoTurn) : joint.normal) : undefined,
      turn: joint.shape === "head" ? (joint.turn ?? 0) + torsoTurn : joint.turn,
      radius: joint.radius * heightRatio,
    })),
    pelvisHeight: -Math.min(...feet.map((foot) => foot[1])) * heightRatio,
  };
}

export function groundedSportFigureHeight(rig: SportRig, pose: Pose): number {
  const pitch = radians(pose.pitch ?? 0);
  const roll = radians(pose.roll ?? 0);
  const lowest = Math.min(...[
    ...rig.segments.flatMap((segment) => [segment.start, segment.end]),
    ...rig.joints.map((joint) => joint.point),
  ].map(([x, y, z]) => {
    // Three.js applies the inner XYZ rotation before the outer yaw rotation.
    const rolledY = x * Math.sin(roll) + y * Math.cos(roll);
    return rolledY * Math.cos(pitch) - z * Math.sin(pitch);
  }));
  return -lowest + Math.max(0, pose.height ?? 0) / 100;
}
