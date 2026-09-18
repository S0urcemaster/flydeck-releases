export type SportPlaybackStep = {
  progress: number;
  ended: boolean;
  looped: boolean;
};

type SportPlaybackKeyframe = { values: Record<string, number> };

export function interpolateSportPose(poses: readonly SportPlaybackKeyframe[], progress: number, axes: readonly string[], settings?: { shortestRotation?: boolean; smoothMotion?: boolean }): Record<string, number> {
  if (poses.length === 0) return {};
  const wrapped = ((progress % poses.length) + poses.length) % poses.length;
  const first = Math.floor(wrapped);
  const second = (first + 1) % poses.length;
  const linearMix = wrapped - first;
  const mix = settings?.smoothMotion ? linearMix * linearMix * (3 - 2 * linearMix) : linearMix;
  return Object.fromEntries(axes.map((axis) => [
    axis,
    interpolateAxis(poses[first]?.values[axis] ?? 0, poses[second]?.values[axis] ?? 0, mix, Boolean(settings?.shortestRotation && cyclicAxes.has(axis))),
  ]));
}

const cyclicAxes = new Set(["viewAngle", "yaw"]);
function interpolateAxis(start: number, end: number, mix: number, shortest: boolean) {
  const delta = shortest ? ((end - start + 540) % 360) - 180 : end - start;
  return start + delta * mix;
}

export function advanceSportPlayback(current: number, lastFrame: number, step: number, loop: boolean): SportPlaybackStep {
  const next = current + step;
  if (next < lastFrame) return { progress: next, ended: false, looped: false };
  if (loop && lastFrame > 0) return { progress: next % lastFrame, ended: false, looped: true };
  return { progress: lastFrame, ended: true, looped: false };
}
