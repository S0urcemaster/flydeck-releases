import { describe, expect, it } from "vitest";
import { defaultSportPosePresets, parseSportPosePresets, sportPosePresetsContent } from "./SportPosePresets";

describe("sport pose presets", () => {
  it("round trips the preset list", () => expect(parseSportPosePresets(sportPosePresetsContent(defaultSportPosePresets))).toEqual(defaultSportPosePresets));
  it("rejects incomplete poses", () => expect(parseSportPosePresets(JSON.stringify({ schema: "flydeck.sport.pose-presets/v1", items: [{ id: "x", label: "X", values: {} }] }))).toBeNull());
});
