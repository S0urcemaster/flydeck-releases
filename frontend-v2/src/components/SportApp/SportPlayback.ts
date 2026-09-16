export type SportPlaybackStep = {
  progress: number;
  ended: boolean;
  looped: boolean;
};

type SportPlaybackKeyframe = { values: Record<string, number> };

export function interpolateSportPose(poses: readonly SportPlaybackKeyframe[], progress: number, axes: readonly string[]): Record<string, number> {
  if (poses.length === 0) return {};
  const wrapped = ((progress % poses.length) + poses.length) % poses.length;
  const first = Math.floor(wrapped);
  const second = (first + 1) % poses.length;
  const mix = wrapped - first;
  return Object.fromEntries(axes.map((axis) => [
    axis,
    (poses[first]?.values[axis] ?? 0) * (1 - mix) + (poses[second]?.values[axis] ?? 0) * mix,
  ]));
}

export function advanceSportPlayback(current: number, lastFrame: number, step: number, loop: boolean): SportPlaybackStep {
  const next = current + step;
  if (next < lastFrame) return { progress: next, ended: false, looped: false };
  if (loop && lastFrame > 0) return { progress: next % lastFrame, ended: false, looped: true };
  return { progress: lastFrame, ended: true, looped: false };
}
