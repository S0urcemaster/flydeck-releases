import { useEffect, useRef } from "react";

import initLifelings, { LifeEngine } from "./lifelings/lifelings";

const automaticStopDelay = 3 * 60 * 1_000;

export function LifelingsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let engine: LifeEngine | undefined;
    let animationFrame = 0;
    let resizeFrame = 0;
    let automaticStopTimer = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dimensions = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      return {
        width: Math.max(1, Math.round(window.innerWidth * pixelRatio)),
        height: Math.max(1, Math.round(window.innerHeight * pixelRatio)),
      };
    };
    const render = () => {
      engine?.tick();
      animationFrame = window.requestAnimationFrame(render);
    };
    const stopAnimation = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      canvas.dataset.paused = "true";
    };
    const resetAutomaticStop = () => {
      window.clearTimeout(automaticStopTimer);
      automaticStopTimer = window.setTimeout(stopAnimation, automaticStopDelay);
    };
    const toggleAnimation = () => {
      if (reducedMotion || !engine) return;
      if (animationFrame) {
        window.clearTimeout(automaticStopTimer);
        stopAnimation();
      } else {
        delete canvas.dataset.paused;
        render();
        resetAutomaticStop();
      }
    };
    const toggleFromBackground = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const blocker = target?.closest("a, button, article, .postNavigation, .siteHeader, footer");
      if (!target || blocker) return;
      toggleAnimation();
    };
    const resize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (!engine) return;
        const { width, height } = dimensions();
        engine.resize(width, height);
        if (reducedMotion) engine.tick();
      });
    };

    void initLifelings().then(() => {
      if (cancelled) return;
      const { width, height } = dimensions();
      engine = new LifeEngine(canvas, width, height, 18, true);
      if (reducedMotion) engine.tick();
      else {
        render();
        resetAutomaticStop();
      }
      window.addEventListener("resize", resize);
      document.addEventListener("click", toggleFromBackground);
    }).catch((error: unknown) => {
      console.error("Could not start the Relay background animation.", error);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      document.removeEventListener("click", toggleFromBackground);
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(automaticStopTimer);
      engine?.free();
    };
  }, []);

  return <canvas aria-hidden="true" className="lifelingsBackground" ref={canvasRef} />;
}
