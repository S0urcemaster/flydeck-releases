export type SportPose = Record<string, number>;
export type SportKeyframe = { id: string; values: SportPose };
export type SportPlacedFurniture = { enabled: boolean; x: number; y: number; rotation: number; color: string };
export type SportWallBar = { enabled: boolean; x: number; y: number; length: number; color: string };
export type SportPlant = { enabled: boolean; x: number; y: number; color: string };
export type SportFurniture = {
  table: SportPlacedFurniture & { height: number; width: number; depth: number };
  chair: SportPlacedFurniture;
  bench: SportPlacedFurniture & { backrest: number };
  dumbbells: boolean;
  dumbbellSize: number;
  dumbbellColor: string;
  wallBar: SportWallBar;
  plant: SportPlant;
  mat: SportPlacedFurniture & { width: number; depth: number };
  poster: { enabled: boolean; y: number; z: number; width: number; color: string };
};
export type SportExercise = {
  schema: "flydeck.sport.exercise/v1";
  comment: string;
  secondsPerKeyframe: number;
  furniture: SportFurniture;
  keyframes: SportKeyframe[];
};

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
};

export function createSportFurniture(): SportFurniture {
  return {
    ...defaultSportFurniture,
    table: { ...defaultSportFurniture.table },
    chair: { ...defaultSportFurniture.chair },
    bench: { ...defaultSportFurniture.bench },
    wallBar: { ...defaultSportFurniture.wallBar },
    plant: { ...defaultSportFurniture.plant },
    mat: { ...defaultSportFurniture.mat },
    poster: { ...defaultSportFurniture.poster },
  };
}

export const defaultSportPose: SportPose = {
  viewAngle: 0, viewHeight: 1.95, viewZoom: 100,
  x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, height: 0,
  lowerSpine: 0, spine: 0, torsoTurn: 0, head: 0, headTilt: 0, headSideTilt: 0, headTurn: 0,
  leftShoulder: 0, leftShoulderSide: 0, leftShoulderTurn: 0, leftElbow: 0, leftElbowTurn: 0, leftHandFlex: 0,
  rightShoulder: 0, rightShoulderSide: 0, rightShoulderTurn: 0, rightElbow: 0, rightElbowTurn: 0, rightHandFlex: 0,
  leftHip: 0, leftHipSide: 0, leftKnee: 0, leftKneeTurn: 0, leftAnkle: 0,
  rightHip: 0, rightHipSide: 0, rightKnee: 0, rightKneeTurn: 0, rightAnkle: 0,
};

export function createSportExercise(): SportExercise {
  return {
    schema: "flydeck.sport.exercise/v1",
    comment: "",
    secondsPerKeyframe: 1.2,
    furniture: createSportFurniture(),
    keyframes: [{ id: crypto.randomUUID(), values: { ...defaultSportPose } }],
  };
}

export function parseSportExercise(content: string | undefined): SportExercise | null {
  if (!content) return null;
  try {
    const value: unknown = JSON.parse(content);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const exercise = value as Partial<SportExercise>;
    if (exercise.schema !== "flydeck.sport.exercise/v1" || !Array.isArray(exercise.keyframes) || exercise.keyframes.length === 0) return null;
    if (exercise.comment !== undefined && typeof exercise.comment !== "string") return null;
    if (exercise.secondsPerKeyframe !== undefined && (!Number.isFinite(exercise.secondsPerKeyframe) || exercise.secondsPerKeyframe! <= 0)) return null;
    const furniture = parseSportFurniture(exercise.furniture);
    if (exercise.furniture !== undefined && !furniture) return null;
    const optionalAxes = new Set(["viewAngle", "viewHeight", "viewZoom", "x", "y", "height", "lowerSpine", "headTilt", "headSideTilt", "headTurn", "torsoTurn", "leftShoulderTurn", "rightShoulderTurn", "leftKneeTurn", "rightKneeTurn", "leftHandFlex", "rightHandFlex", "leftElbowTurn", "rightElbowTurn"]);
    if (!exercise.keyframes.every((frame) => frame && typeof frame.id === "string" && frame.values && typeof frame.values === "object" && Object.keys(defaultSportPose).every((key) => (optionalAxes.has(key) && frame.values[key] === undefined) || Number.isFinite(frame.values[key])))) return null;
    return {
      schema: "flydeck.sport.exercise/v1",
      comment: exercise.comment ?? "",
      secondsPerKeyframe: exercise.secondsPerKeyframe ?? 1.2,
      furniture: furniture ?? createSportFurniture(),
      keyframes: exercise.keyframes.map((frame) => ({ id: frame.id, values: {
        ...defaultSportPose, ...frame.values,
        leftElbowTurn: frame.values.leftElbowTurn ?? frame.values.leftHandTurn ?? 0,
        rightElbowTurn: frame.values.rightElbowTurn ?? frame.values.rightHandTurn ?? 0,
      } })),
    };
  } catch { return null; }
}

function parseSportFurniture(value: unknown): SportFurniture | null {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<SportFurniture>;
  const color = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const placed = <T extends SportPlacedFurniture>(item: unknown, fallback: T, bench = false): T | null => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const part = item as Partial<SportPlacedFurniture & { backrest: number }>;
    if (typeof part.enabled !== "boolean" || !Number.isFinite(part.x) || !Number.isFinite(part.y) || !Number.isFinite(part.rotation) || (bench && !Number.isFinite(part.backrest))) return null;
    return { ...fallback, ...part, color: color(part.color, fallback.color), ...(bench ? { backrest: part.backrest! } : {}) } as T;
  };
  const table = placed(candidate.table, defaultSportFurniture.table);
  const chair = placed(candidate.chair, defaultSportFurniture.chair);
  const bench = placed(candidate.bench, defaultSportFurniture.bench, true);
  if (!table || !chair || !bench || typeof candidate.dumbbells !== "boolean") return null;
  const wallCandidate = candidate.wallBar;
  const wallBar = typeof wallCandidate === "boolean" ? { ...defaultSportFurniture.wallBar, enabled: wallCandidate } : { ...defaultSportFurniture.wallBar, ...(wallCandidate && typeof wallCandidate === "object" ? Object.fromEntries(Object.entries(wallCandidate).filter(([, item]) => typeof item === "boolean" || Number.isFinite(item) || typeof item === "string")) : {}) };
  wallBar.color = color(wallBar.color, defaultSportFurniture.wallBar.color);
  const plantCandidate = candidate.plant;
  const plant = { ...defaultSportFurniture.plant, ...(plantCandidate && typeof plantCandidate === "object" ? plantCandidate : {}) };
  plant.color = color(plant.color, defaultSportFurniture.plant.color);
  const mat = placed(candidate.mat ?? defaultSportFurniture.mat, defaultSportFurniture.mat) ?? { ...defaultSportFurniture.mat };
  const posterCandidate = candidate.poster;
  const poster = { ...defaultSportFurniture.poster, ...(posterCandidate && typeof posterCandidate === "object" ? posterCandidate : {}) };
  poster.color = color(poster.color, defaultSportFurniture.poster.color);
  return { table, chair, bench: bench as SportFurniture["bench"], dumbbells: candidate.dumbbells, dumbbellSize: Number.isFinite(candidate.dumbbellSize) ? candidate.dumbbellSize! : 100, dumbbellColor: color(candidate.dumbbellColor, defaultSportFurniture.dumbbellColor), wallBar, plant, mat, poster };
}

const armAxes = ["Shoulder", "ShoulderSide", "ShoulderTurn", "Elbow", "ElbowTurn", "HandFlex"] as const;
const legAxes = ["Hip", "HipSide", "Knee", "KneeTurn", "Ankle"] as const;

export function mirrorSportLimb(pose: SportPose, limb: "arm" | "leg", source: "left" | "right" = "left"): SportPose {
  const target = source === "left" ? "right" : "left";
  const axes = limb === "arm" ? armAxes : legAxes;
  return axes.reduce((values, axis) => ({ ...values, [`${target}${axis}`]: values[`${source}${axis}`] }), { ...pose });
}

export function changeSportPoseAxis(pose: SportPose, axis: string, value: number, armSymmetry: boolean, legSymmetry: boolean): SportPose {
  const next = { ...pose, [axis]: value };
  for (const [limb, axes, enabled] of [["arm", armAxes, armSymmetry], ["leg", legAxes, legSymmetry]] as const) {
    if (!enabled) continue;
    const side = axis.startsWith("left") ? "left" : axis.startsWith("right") ? "right" : null;
    if (!side) continue;
    const suffix = axis.slice(side.length);
    if (axes.some((candidate) => candidate === suffix)) return mirrorSportLimb(next, limb, side);
  }
  return next;
}

export function addSportKeyframe(exercise: SportExercise, selected: number): SportExercise {
  const next = [...exercise.keyframes];
  const source = next[selected] ?? next.at(-1)!;
  next.splice(selected + 1, 0, {
    id: crypto.randomUUID(),
    values: { ...source.values },
  });
  return { ...exercise, keyframes: next };
}

export function deleteSportKeyframe(exercise: SportExercise, selected: number): SportExercise {
  if (exercise.keyframes.length <= 1) return exercise;
  return { ...exercise, keyframes: exercise.keyframes.filter((_, index) => index !== selected) };
}

export function moveSportKeyframe(exercise: SportExercise, selected: number, direction: -1 | 1): SportExercise {
  const neighbour = selected + direction;
  if (neighbour < 0 || neighbour >= exercise.keyframes.length) return exercise;
  const next = [...exercise.keyframes];
  [next[selected], next[neighbour]] = [next[neighbour], next[selected]];
  return { ...exercise, keyframes: next };
}
