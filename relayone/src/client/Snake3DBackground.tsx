import { useEffect, useRef } from "react";

import snakeModuleUrl from "./snake3d/snake3d.wasm?url";

type SnakeModule = WebAssembly.Exports & {
  snake_init(seed: number): void;
  snake_step(): void;
  snake_length(): number;
  snake_x(index: number): number;
  snake_y(index: number): number;
  snake_z(index: number): number;
  food_x(): number;
  food_y(): number;
  food_z(): number;
};

type Point3 = { x: number; y: number; z: number };
type ProjectedPoint = Point3 & { screenX: number; screenY: number; scale: number };

const automaticStopDelay = 3 * 60 * 1_000;
const grid = { x: 9, y: 7, z: 9 };

async function loadSnakeModule(): Promise<SnakeModule> {
  const response = await fetch(snakeModuleUrl);
  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes);
  return instance.exports as SnakeModule;
}

function rotate(point: Point3, yaw: number, pitch: number): Point3 {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x = point.x * cosY - point.z * sinY;
  const z = point.x * sinY + point.z * cosY;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  return { x, y: point.y * cosP - z * sinP, z: point.y * sinP + z * cosP };
}

export function Snake3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let cancelled = false;
    let wasm: SnakeModule | undefined;
    let frame = 0;
    let resizeFrame = 0;
    let stopTimer = 0;
    let previousTime = 0;
    let stepAccumulator = 0;
    let stepMix = 1;
    let previousSnake: Point3[] = [];
    let currentSnake: Point3[] = [];
    let food: Point3 = { x: 0, y: 0, z: 0 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileRendering = window.matchMedia("(max-width: 48rem), (pointer: coarse)").matches;
    const minimumFrameTime = mobileRendering ? 1_000 / 30 : 0;
    let backgroundGradient: CanvasGradient;
    let resumeAfterVisibility = false;

    const resize = () => {
      const ratio = mobileRendering ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(window.innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(window.innerHeight * ratio));
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      backgroundGradient = context.createRadialGradient(
        window.innerWidth * 0.48,
        window.innerHeight * 0.42,
        0,
        window.innerWidth * 0.48,
        window.innerHeight * 0.42,
        Math.max(window.innerWidth, window.innerHeight) * 0.76,
      );
      backgroundGradient.addColorStop(0, "#172c39");
      backgroundGradient.addColorStop(0.52, "#0b1623");
      backgroundGradient.addColorStop(1, "#03070d");
    };

    const readState = () => {
      if (!wasm) return;
      previousSnake = currentSnake.length ? currentSnake : [];
      currentSnake = Array.from({ length: wasm.snake_length() }, (_, index) => ({
        x: wasm!.snake_x(index), y: wasm!.snake_y(index), z: wasm!.snake_z(index),
      }));
      if (!previousSnake.length) previousSnake = currentSnake;
      food = { x: wasm.food_x(), y: wasm.food_y(), z: wasm.food_z() };
    };

    const render = (time: number) => {
      if (minimumFrameTime && previousTime && time - previousTime < minimumFrameTime) {
        frame = window.requestAnimationFrame(render);
        return;
      }
      const width = window.innerWidth;
      const height = window.innerHeight;
      const delta = Math.min(50, previousTime ? time - previousTime : 16);
      previousTime = time;
      stepAccumulator += delta;
      if (stepAccumulator >= 240 && wasm && !reducedMotion) {
        stepAccumulator %= 240;
        wasm.snake_step();
        readState();
        stepMix = 0;
      }
      stepMix = Math.min(1, stepMix + delta / 190);

      context.clearRect(0, 0, width, height);
      context.fillStyle = backgroundGradient;
      context.fillRect(0, 0, width, height);

      const yaw = time * 0.000055;
      const pitch = -0.28 + Math.sin(time * 0.00009) * 0.055;
      // Fit the rotating cube to the viewport's limiting edge. Perspective
      // makes its visible footprint roughly two thirds of this scale.
      const roomScale = Math.min(width, height) * 1.42;
      const project = (point: Point3): ProjectedPoint => {
        const centered = { x: point.x / (grid.x - 1) - 0.5, y: point.y / (grid.y - 1) - 0.5, z: point.z / (grid.z - 1) - 0.5 };
        const rotated = rotate(centered, yaw, pitch);
        const depth = 2.05 + rotated.z;
        const scale = roomScale / depth;
        return { ...point, screenX: width / 2 + rotated.x * scale, screenY: height / 2 + rotated.y * scale, scale: 1 / depth };
      };

      const corners: Point3[] = [
        {x:0,y:0,z:0},{x:8,y:0,z:0},{x:8,y:6,z:0},{x:0,y:6,z:0},
        {x:0,y:0,z:8},{x:8,y:0,z:8},{x:8,y:6,z:8},{x:0,y:6,z:8},
      ];
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      const drawRoomLine = (start: Point3, end: Point3, baseWidth = 0.65) => {
        const projectedStart = project(start);
        const projectedEnd = project(end);
        const averageDepthScale = (projectedStart.scale + projectedEnd.scale) / 2;
        const depthWeight = Math.max(0.6, Math.min(1.65, 2.25 - averageDepthScale * 2.6));
        context.lineWidth = baseWidth * depthWeight;
        context.beginPath();
        context.moveTo(projectedStart.screenX, projectedStart.screenY);
        context.lineTo(projectedEnd.screenX, projectedEnd.screenY);
        context.stroke();
      };

      context.strokeStyle = "rgba(91, 165, 202, .105)";
      const gridStep = mobileRendering ? 2 : 1;
      for (let x = 1; x < grid.x - 1; x += gridStep) {
        drawRoomLine({ x, y: 0, z: 0 }, { x, y: 0, z: 8 });
        drawRoomLine({ x, y: 6, z: 0 }, { x, y: 6, z: 8 });
        drawRoomLine({ x, y: 0, z: 0 }, { x, y: 6, z: 0 });
        drawRoomLine({ x, y: 0, z: 8 }, { x, y: 6, z: 8 });
      }
      for (let y = 1; y < grid.y - 1; y += gridStep) {
        drawRoomLine({ x: 0, y, z: 0 }, { x: 8, y, z: 0 });
        drawRoomLine({ x: 0, y, z: 8 }, { x: 8, y, z: 8 });
        drawRoomLine({ x: 0, y, z: 0 }, { x: 0, y, z: 8 });
        drawRoomLine({ x: 8, y, z: 0 }, { x: 8, y, z: 8 });
      }
      for (let z = 1; z < grid.z - 1; z += gridStep) {
        drawRoomLine({ x: 0, y: 0, z }, { x: 8, y: 0, z });
        drawRoomLine({ x: 0, y: 6, z }, { x: 8, y: 6, z });
        drawRoomLine({ x: 0, y: 0, z }, { x: 0, y: 6, z });
        drawRoomLine({ x: 8, y: 0, z }, { x: 8, y: 6, z });
      }

      context.strokeStyle = "rgba(91, 165, 202, .34)";
      for (const [a, b] of edges) {
        drawRoomLine(corners[a], corners[b], 1.1);
      }

      const points = currentSnake.map((point, index) => {
        const old = previousSnake[Math.min(index, previousSnake.length - 1)] ?? point;
        return { ...project({ x: old.x + (point.x - old.x) * stepMix, y: old.y + (point.y - old.y) * stepMix, z: old.z + (point.z - old.z) * stepMix }), bodyIndex: index };
      }).sort((a, b) => a.scale - b.scale);

      const pulse = 1 + Math.sin(time * 0.005) * 0.16;
      const drawSphere = (point: ProjectedPoint, halfSize: number, head: boolean, foodSphere = false) => {
        const radius = Math.max(3, roomScale * (halfSize / (grid.x - 1)) * point.scale);
        const sphereGradient = context.createRadialGradient(
          point.screenX - radius * 0.32,
          point.screenY - radius * 0.36,
          radius * 0.08,
          point.screenX,
          point.screenY,
          radius,
        );
        if (foodSphere) {
          sphereGradient.addColorStop(0, "#fff5c2");
          sphereGradient.addColorStop(0.32, "#ffd477");
          sphereGradient.addColorStop(1, "#8a5b16");
        } else if (head) {
          sphereGradient.addColorStop(0, "#e9fbff");
          sphereGradient.addColorStop(0.35, "#62d7f5");
          sphereGradient.addColorStop(1, "#126d94");
        } else {
          sphereGradient.addColorStop(0, "#d4ffea");
          sphereGradient.addColorStop(0.35, "#43d49a");
          sphereGradient.addColorStop(1, "#0d624a");
        }
        context.globalAlpha = 0.8;
        context.shadowBlur = foodSphere ? 22 : head ? 28 : mobileRendering ? 0 : 16;
        context.shadowColor = foodSphere ? "#ffcc66" : head ? "#83e5ff" : "#49c69a";
        context.fillStyle = sphereGradient;
        context.strokeStyle = foodSphere ? "#ffe194" : head ? "#d3faff" : "#aeffda";
        context.lineWidth = head ? 1.15 : 0.75;
        context.beginPath();
        context.arc(point.screenX, point.screenY, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      };

      drawSphere(project(food), 0.31 * pulse, false, true);

      points.forEach((point) => {
        const head = point.bodyIndex === 0;
        drawSphere(point, 0.48, head);
      });
      context.globalAlpha = 1;
      context.shadowBlur = 0;

      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    const stop = () => { window.cancelAnimationFrame(frame); frame = 0; canvas.dataset.paused = "true"; };
    const start = () => { delete canvas.dataset.paused; previousTime = 0; frame = window.requestAnimationFrame(render); window.clearTimeout(stopTimer); stopTimer = window.setTimeout(stop, automaticStopDelay); };
    const toggle = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("a, button, article, .postNavigation, .siteHeader, footer")) return;
      if (frame) stop(); else if (!reducedMotion) start();
    };
    const queueResize = () => { window.cancelAnimationFrame(resizeFrame); resizeFrame = window.requestAnimationFrame(resize); };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        resumeAfterVisibility = Boolean(frame);
        if (frame) stop();
      } else if (resumeAfterVisibility && !reducedMotion) {
        resumeAfterVisibility = false;
        start();
      }
    };

    resize();
    void loadSnakeModule().then((module) => {
      if (cancelled) return;
      wasm = module;
      wasm.snake_init((Date.now() ^ 0x51a4e31) >>> 0);
      readState();
      if (reducedMotion) render(0); else start();
      window.addEventListener("resize", queueResize);
      document.addEventListener("click", toggle);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }).catch((error: unknown) => console.error("Could not start the 3D Snake background.", error));

    return () => {
      cancelled = true;
      window.removeEventListener("resize", queueResize);
      document.removeEventListener("click", toggle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(stopTimer);
    };
  }, []);

  return <canvas aria-hidden="true" className="snake3dBackground" ref={canvasRef} />;
}
