export type SportPose = Record<string, number>;
export type SportKeyframe = { id: string; values: SportPose; comment: string };
export type PlacedFurniture = { enabled: boolean; x: number; y: number; rotation: number; color: string };
export type SportFurniture = {
  table: PlacedFurniture & { height: number; width: number; depth: number };
  chair: PlacedFurniture;
  bench: PlacedFurniture & { backrest: number };
  dumbbells: boolean;
  dumbbellSize: number;
  dumbbellColor: string;
  wallBar: { enabled: boolean; x: number; y: number; length: number; color: string };
  plant: { enabled: boolean; x: number; y: number; color: string };
  mat: PlacedFurniture & { width: number; depth: number };
  poster: { enabled: boolean; y: number; z: number; width: number; color: string };
  coordinateAxes: boolean;
};
export type SportMetrics = {
  bodyHeight: number; shoulderWidth: number; hipWidth: number; upperLeg: number;
  lowerLeg: number; upperArm: number; lowerArm: number; hipShoulder: number;
};
export type SportModelSettings = { kneeRotationLimits: boolean; shoulderRhythm: boolean; softJointLimits: boolean; shortestRotation: boolean; smoothMotion: boolean; footContact: boolean };
export type SportExercise = {
  schema: "flydeck.sport.exercise/v1";
  comment: string;
  secondsPerKeyframe: number;
  keyframes: SportKeyframe[];
  furniture: SportFurniture;
  metrics: SportMetrics;
  modelSettings: SportModelSettings;
};
export const defaultSportModelSettings: SportModelSettings = { kneeRotationLimits: false, shoulderRhythm: false, softJointLimits: false, shortestRotation: false, smoothMotion: false, footContact: false };

export const defaultSportPose: SportPose = {
  viewAngle: 0, viewHeight: 1.95, viewZoom: 100,
  x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, height: 0,
  lowerSpine: 0, spine: 0, torsoTurn: 0, head: 0, headTilt: 0, headSideTilt: 0, headTurn: 0,
  leftShoulderHeight: 0, leftShoulderForward: 0, rightShoulderHeight: 0, rightShoulderForward: 0,
  leftShoulder: 0, leftShoulderSide: 0, leftShoulderTurn: 0, leftElbow: 0, leftElbowTurn: 0, leftHandFlex: 0,
  rightShoulder: 0, rightShoulderSide: 0, rightShoulderTurn: 0, rightElbow: 0, rightElbowTurn: 0, rightHandFlex: 0,
  leftHip: 0, leftHipSide: 0, leftKnee: 0, leftKneeTurn: 0, leftAnkle: 0,
  rightHip: 0, rightHipSide: 0, rightKnee: 0, rightKneeTurn: 0, rightAnkle: 0,
};
export const sportPoseAxes = Object.keys(defaultSportPose);
export const defaultSportMetrics: SportMetrics = { bodyHeight: 180, shoulderWidth: 44, hipWidth: 32, upperLeg: 44, lowerLeg: 42, upperArm: 30, lowerArm: 27, hipShoulder: 55 };
export const defaultSportFurniture: SportFurniture = {
  table: { enabled: false, x: 1.2, y: 0, rotation: 0, color: "#9a7256", height: .8, width: 1.05, depth: .62 },
  chair: { enabled: false, x: -1.1, y: 0, rotation: 0, color: "#b28a68" },
  bench: { enabled: false, x: 0, y: 0, rotation: 0, color: "#526d77", backrest: 0 },
  dumbbells: false,
  dumbbellSize: 100,
  dumbbellColor: "#394953",
  wallBar: { enabled: false, x: 0, y: 1.9, length: 1.35, color: "#b28a68" },
  plant: { enabled: false, x: -2.05, y: -2.05, color: "#5d9368" },
  mat: { enabled: true, x: 0, y: 0, rotation: 0, color: "#365f69", width: 1, depth: 2 },
  poster: { enabled: true, y: 1.55, z: .82, width: .68, color: "#31566a" },
  coordinateAxes: true,
};

export function isSportExerciseContent(content: string): boolean {
  try { return JSON.parse(content)?.schema === "flydeck.sport.exercise/v1"; } catch { return false; }
}

export function parseSportExercise(content: string): SportExercise | null {
  try {
    const raw: unknown = JSON.parse(content);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const value = raw as Partial<SportExercise>;
    if (value.schema !== "flydeck.sport.exercise/v1" || !Array.isArray(value.keyframes) || value.keyframes.length === 0) return null;
    const keyframes = value.keyframes.map((frame, index) => {
      if (!frame || typeof frame.id !== "string" || !frame.values || typeof frame.values !== "object") return null;
      if (!sportPoseAxes.every((axis) => frame.values[axis] === undefined || Number.isFinite(frame.values[axis]))) return null;
      return { id: frame.id, comment: typeof frame.comment === "string" ? frame.comment : index === 0 && typeof value.comment === "string" ? value.comment : "", values: {
        ...defaultSportPose, ...frame.values,
        leftElbowTurn: frame.values.leftElbowTurn ?? frame.values.leftHandTurn ?? 0,
        rightElbowTurn: frame.values.rightElbowTurn ?? frame.values.rightHandTurn ?? 0,
      } };
    });
    if (keyframes.some((frame) => !frame)) return null;
    return {
      schema: value.schema,
      comment: typeof value.comment === "string" ? value.comment : "",
      secondsPerKeyframe: Number.isFinite(value.secondsPerKeyframe) && value.secondsPerKeyframe! > 0 ? value.secondsPerKeyframe! : 1.2,
      keyframes: keyframes as SportKeyframe[],
      furniture: normalizeFurniture(value.furniture),
      metrics: normalizeMetrics(value.metrics),
      modelSettings: normalizeModelSettings(value.modelSettings),
    };
  } catch { return null; }
}

export function sportKeyframeComment(keyframes: readonly SportKeyframe[], index: number): string {
  if (!keyframes.length) return "";
  for (let offset = 0; offset < keyframes.length; offset += 1) {
    const comment = keyframes[(index - offset + keyframes.length) % keyframes.length].comment;
    if (comment.trim()) return comment;
  }
  return "";
}

export function interpolateSportPose(keyframes: readonly SportKeyframe[], progress: number, settings: SportModelSettings = defaultSportModelSettings): SportPose {
  const wrapped = ((progress % keyframes.length) + keyframes.length) % keyframes.length;
  const first = Math.floor(wrapped);
  const second = (first + 1) % keyframes.length;
  const linearMix = wrapped - first;
  const mix = settings.smoothMotion ? linearMix * linearMix * (3 - 2 * linearMix) : linearMix;
  return Object.fromEntries(sportPoseAxes.map((axis) => [axis,
    keyframes[first].values[axis] + (settings.shortestRotation && (axis === "yaw" || axis === "viewAngle") ? ((keyframes[second].values[axis] - keyframes[first].values[axis] + 540) % 360) - 180 : keyframes[second].values[axis] - keyframes[first].values[axis]) * mix,
  ]));
}

function normalizeModelSettings(value: unknown): SportModelSettings {
  if (!value || typeof value !== "object") return { ...defaultSportModelSettings };
  const candidate = value as Partial<SportModelSettings>;
  return Object.fromEntries(Object.keys(defaultSportModelSettings).map((key) => [key, candidate[key as keyof SportModelSettings] === true])) as SportModelSettings;
}

function normalizeMetrics(value: unknown): SportMetrics {
  if (!value || typeof value !== "object") return { ...defaultSportMetrics };
  const candidate = value as Partial<SportMetrics>;
  return Object.fromEntries(Object.entries(defaultSportMetrics).map(([key, fallback]) => {
    const dimension = candidate[key as keyof SportMetrics];
    return [key, Number.isFinite(dimension) && (dimension ?? 0) > 0 ? dimension : fallback];
  })) as SportMetrics;
}

function normalizeFurniture(value: unknown): SportFurniture {
  if (!value || typeof value !== "object") return structuredClone(defaultSportFurniture);
  const candidate = value as Partial<SportFurniture>;
  const placed = <T extends PlacedFurniture>(part: Partial<T> | undefined, fallback: T): T => ({
    ...numericObject(part, fallback),
    ...(part && typeof part.enabled === "boolean" ? { enabled: part.enabled } : {}),
    ...(Number.isFinite(part?.x) ? { x: part!.x } : {}),
    ...(Number.isFinite(part?.y) ? { y: part!.y } : {}),
    ...(Number.isFinite(part?.rotation) ? { rotation: part!.rotation } : {}),
    ...(typeof part?.color === "string" ? { color: part.color } : {}),
    ...("backrest" in fallback && Number.isFinite((part as Partial<SportFurniture["bench"]>)?.backrest) ? { backrest: (part as Partial<SportFurniture["bench"]>).backrest } : {}),
  } as T);
  const wallBar = typeof candidate.wallBar === "boolean" ? { ...defaultSportFurniture.wallBar, enabled: candidate.wallBar } : numericObject(candidate.wallBar, defaultSportFurniture.wallBar);
  return {
    table: placed(candidate.table, defaultSportFurniture.table),
    chair: placed(candidate.chair, defaultSportFurniture.chair),
    bench: placed(candidate.bench, defaultSportFurniture.bench),
    dumbbells: candidate.dumbbells === true,
    dumbbellSize: Number.isFinite(candidate.dumbbellSize) ? candidate.dumbbellSize! : 100,
    dumbbellColor: typeof candidate.dumbbellColor === "string" ? candidate.dumbbellColor : defaultSportFurniture.dumbbellColor,
    wallBar,
    plant: numericObject(candidate.plant, defaultSportFurniture.plant),
    mat: placed(candidate.mat, defaultSportFurniture.mat),
    poster: numericObject(candidate.poster, defaultSportFurniture.poster),
    coordinateAxes: typeof candidate.coordinateAxes === "boolean" ? candidate.coordinateAxes : true,
  };
}

function numericObject<T extends object>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object") return { ...fallback };
  return Object.fromEntries(Object.entries(fallback).map(([key, initial]) => {
    const candidate = (value as Record<string, unknown>)[key];
    return [key, typeof initial === "boolean" ? (typeof candidate === "boolean" ? candidate : initial) : typeof initial === "string" ? (typeof candidate === "string" ? candidate : initial) : (Number.isFinite(candidate) ? candidate : initial)];
  })) as T;
}
