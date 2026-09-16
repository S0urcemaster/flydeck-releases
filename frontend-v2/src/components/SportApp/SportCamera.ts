export type SportCameraControls = { angle: number; height: number; zoom: number };

export const defaultSportCamera: SportCameraControls = { angle: 0, height: 1.95, zoom: 100 };

export function sportCameraView(controls: SportCameraControls) {
  const distance = 3.6 * 100 / Math.max(50, Math.min(180, controls.zoom));
  const angle = (35 - controls.angle) * Math.PI / 180;
  const targetHeight = .95 + distance * .085;
  return {
    position: [Math.sin(angle) * distance, controls.height, Math.cos(angle) * distance] as [number, number, number],
    target: [0, targetHeight, 0] as [number, number, number],
  };
}
