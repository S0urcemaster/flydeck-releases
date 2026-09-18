import { useEffect, useMemo, useRef, useState } from "react";
import { interpolateSportPose, parseSportExercise, sportKeyframeComment } from "./SportPlayerData";
import { SportPlayerScene } from "./SportPlayerScene";

export function SportPlayer({ content }: { content: string }) {
  const exercise = useMemo(() => parseSportExercise(content), [content]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SportPlayerScene | null>(null);
  const progressRef = useRef(0);
  const dragRef = useRef<{ pointerId: number; x: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);

  useEffect(() => {
    if (!exercise || !canvasRef.current) return;
    const scene = new SportPlayerScene(canvasRef.current, exercise); sceneRef.current = scene;
    const observer = new ResizeObserver(scene.resize); observer.observe(canvasRef.current);
    return () => { observer.disconnect(); scene.destroy(); sceneRef.current = null; };
  }, [content]);

  useEffect(() => {
    if (!exercise || !playing) return;
    let frame = 0; let previous = performance.now(); let lastControlUpdate = 0; let stopped = false;
    const animate = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, .05); previous = now;
      const end = loop ? exercise.keyframes.length : Math.max(0, exercise.keyframes.length - 1);
      let next = progressRef.current + elapsed / exercise.secondsPerKeyframe;
      if (next >= end) {
        if (loop && end > 0) next %= end;
        else { next = end; stopped = true; setPlaying(false); }
      }
      progressRef.current = next;
      sceneRef.current?.update(interpolateSportPose(exercise.keyframes, next, exercise.modelSettings));
      if (now - lastControlUpdate > 32 || stopped) { lastControlUpdate = now; setProgress(next); }
      if (!stopped) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [exercise, playing, loop]);

  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  if (!exercise) return <p className="sportPlayerError">This exercise cannot be played.</p>;
  const end = loop ? exercise.keyframes.length : Math.max(0, exercise.keyframes.length - 1);
  const currentKeyframe = Math.round(progress) % exercise.keyframes.length;
  const seek = (value: number) => {
    progressRef.current = value; setProgress(value); setPlaying(false);
    sceneRef.current?.update(interpolateSportPose(exercise.keyframes, value, exercise.modelSettings));
  };
  return <section className="sportPlayer" aria-label="Exercise player">
    <div className="sportViewport"
      onDoubleClick={() => sceneRef.current?.resetView()}
      onPointerDown={(event) => { dragRef.current = { pointerId: event.pointerId, x: event.clientX }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (dragRef.current?.pointerId !== event.pointerId) return; const delta = event.clientX - dragRef.current.x; dragRef.current.x = event.clientX; sceneRef.current?.rotateBy(delta); }}
      onPointerUp={(event) => { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { dragRef.current = null; }}
    ><canvas ref={canvasRef} aria-label="Animated three-dimensional exercise figure. Drag horizontally to rotate the view." /></div>
    <div className="sportPlayerKeyframes" aria-label="Keyframes">
      {exercise.keyframes.map((frame, index) => <button key={frame.id} type="button" className={currentKeyframe === index ? "sportKeyframeActive" : undefined} aria-label={`Show keyframe ${index + 1}`} aria-pressed={currentKeyframe === index} onClick={() => seek(index)}><span>{index + 1}</span></button>)}
    </div>
    <div className="sportPlayerControls">
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => { if (progressRef.current >= end) seek(0); setPlaying((value) => !value); }}>{playing ? "Ⅱ" : "▶"}</button>
      <input aria-label="Playback position" type="range" min="0" max={exercise.keyframes.length} step="0.01" value={progress} onChange={(event) => seek(Number(event.target.value))} />
      <button type="button" className={loop ? "sportLoopActive" : undefined} aria-label={loop ? "Turn loop off" : "Turn loop on"} aria-pressed={loop} onClick={() => setLoop((value) => !value)}>↻</button>
    </div>
    {sportKeyframeComment(exercise.keyframes, currentKeyframe) ? <p className="sportPlayerComment">{sportKeyframeComment(exercise.keyframes, currentKeyframe)}</p> : null}
  </section>;
}
