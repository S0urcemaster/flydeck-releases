import { describe, expect, it } from "vitest";
import { defaultSportCamera, sportCameraView } from "./SportCamera";

describe("sport editor camera", () => {
  it("changes orbit, height and zoom independently", () => {
    const neutral = sportCameraView(defaultSportCamera);
    const orbit = sportCameraView({ ...defaultSportCamera, angle: 90 });
    const raised = sportCameraView({ ...defaultSportCamera, height: 2.5 });
    const closer = sportCameraView({ ...defaultSportCamera, zoom: 150 });
    expect(orbit.position[0]).toBeLessThan(neutral.position[0]);
    expect(orbit.position[1]).toBe(neutral.position[1]);
    expect(raised.position[1]).toBe(2.5);
    expect(raised.position[0]).toBe(neutral.position[0]);
    expect(Math.hypot(closer.position[0], closer.position[2])).toBeLessThan(Math.hypot(neutral.position[0], neutral.position[2]));
    expect(orbit.target).toEqual(neutral.target);
  });
});
