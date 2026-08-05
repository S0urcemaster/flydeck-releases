import {
  useRef,
  type ReactNode,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Base, type BaseProps } from "../Base";
import styles from "./DialSurface.module.css";

export type DialPosition = {
  x: number;
  y: number;
  radius: number;
  angle: number;
};

export type DialInputPhase = "press" | "move" | "release";

export type DialTangentialInput = {
  angle: number;
  phase: DialInputPhase;
};

export type DialSurfaceProps = Omit<
  BaseProps<"button">,
  "as" | "children" | "onPointerDown" | "onPointerMove"
> & {
  children?: ReactNode;
  layer: "outer" | "inner";
  marker?: ReactNode;
  position?: DialPosition | null;
  onTangentialInput?: (input: DialTangentialInput) => void;
};

type MarkerStyle = CSSProperties & {
  "--dial-marker-angle": string;
};

export function DialSurface({
  layer,
  children,
  className,
  marker,
  position,
  onTangentialInput,
  type = "button",
  ...props
}: DialSurfaceProps) {
  const latestPosition = useRef<DialPosition | null>(position ?? null);
  const classes = className ? `${styles.root} ${className}` : styles.root;

  function updatePosition(
    event: ReactPointerEvent<HTMLButtonElement>,
    phase: DialInputPhase,
    clampToEdge = false,
  ): boolean {
    const nextPosition = getDialPosition(
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      event.clientY,
      clampToEdge,
    );

    if (!nextPosition || nextPosition.radius > 1) {
      return false;
    }

    latestPosition.current = nextPosition;
    onTangentialInput?.({ angle: nextPosition.angle, phase });
    return true;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (updatePosition(event, "press")) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updatePosition(event, "move", true);
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    updatePosition(event, "release", true);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const markerStyle = position
    ? {
        "--dial-marker-angle": `${position.angle}deg`,
      } as MarkerStyle
    : undefined;

  return (
    <Base
      {...props}
      as="button"
      type={type}
      className={classes}
      data-layer={layer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
      {position && (
        <span
          className={styles.markerPosition}
          style={markerStyle}
          aria-hidden="true"
        >
          {marker ?? <span className={styles.marker} />}
        </span>
      )}
    </Base>
  );
}

export function getDialPosition(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
  clampToEdge = false,
): DialPosition | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const xFromCenter = clientX - rect.left - rect.width / 2;
  const yFromCenter = clientY - rect.top - rect.height / 2;
  const radiusX = rect.width / 2;
  const radiusY = rect.height / 2;
  const normalizedX = xFromCenter / radiusX;
  const normalizedY = yFromCenter / radiusY;
  const pointerRadius = Math.hypot(normalizedX, normalizedY);
  const positionScale = clampToEdge && pointerRadius > 1
    ? 1 / pointerRadius
    : 1;
  const positionedX = normalizedX * positionScale;
  const positionedY = normalizedY * positionScale;

  return {
    x: positionedX / 2 + 0.5,
    y: positionedY / 2 + 0.5,
    radius: clampToEdge ? Math.min(pointerRadius, 1) : pointerRadius,
    angle: (Math.atan2(normalizedY, normalizedX) * 180 / Math.PI + 450) % 360,
  };
}
