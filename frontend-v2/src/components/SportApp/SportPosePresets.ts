import { defaultSportPose, type SportPose } from "./SportExercise";

export type SportPosePreset = { id: string; label: string; values: SportPose };
export type SportPosePresets = { schema: "flydeck.sport.pose-presets/v1"; items: SportPosePreset[] };

export const defaultSportPosePresets: SportPosePresets = { schema: "flydeck.sport.pose-presets/v1", items: [
  { id: "standing", label: "Standing", values: { ...defaultSportPose } },
  { id: "supine", label: "Supine", values: { ...defaultSportPose, pitch: -90 } },
  { id: "t-pose", label: "T pose", values: { ...defaultSportPose, leftShoulder: 90, rightShoulder: 90, leftShoulderSide: -20, rightShoulderSide: -20 } },
  { id: "squat", label: "Squat", values: { ...defaultSportPose, spine: 15, leftHip: 55, rightHip: 55, leftKnee: 80, rightKnee: 80, leftAnkle: 15, rightAnkle: 15 } },
] };

export function parseSportPosePresets(content: string | undefined): SportPosePresets | null {
  if (!content) return null;
  try {
    const value = JSON.parse(content) as Partial<SportPosePresets>;
    if (value.schema !== "flydeck.sport.pose-presets/v1" || !Array.isArray(value.items)) return null;
    if (!value.items.every((item) => item && typeof item.id === "string" && typeof item.label === "string" && item.values && typeof item.values === "object" && Object.keys(defaultSportPose).every((axis) => Number.isFinite(item.values[axis])))) return null;
    return { schema: "flydeck.sport.pose-presets/v1", items: value.items.map((item) => ({ ...item, values: { ...item.values } })) };
  } catch { return null; }
}

export const sportPosePresetsContent = (value: SportPosePresets) => JSON.stringify(value, null, 2);
