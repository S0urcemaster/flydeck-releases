import type { CSSProperties, ReactNode } from "react";

export type RadialRadius = {
  percent?: number;
  pixels?: number;
};

type RadialMarkProps = {
  angle: number;
  radius: RadialRadius;
  className: string;
  children: ReactNode;
  opacity?: number;
};

export function RadialMark({ angle, radius, className, children, opacity }: RadialMarkProps) {
  const radians = ((angle - 90) * Math.PI) / 180;
  const x = radialCoordinate(Math.cos(radians), radius);
  const y = radialCoordinate(Math.sin(radians), radius);
  const style = { left: x, top: y, opacity } as CSSProperties;

  return <div className={className} style={style}>{children}</div>;
}

function radialCoordinate(direction: number, radius: RadialRadius) {
  const percent = 50 + direction * (radius.percent ?? 0);
  const pixels = direction * (radius.pixels ?? 0);
  if (Math.abs(pixels) < 0.001) return `${percent}%`;
  return `calc(${percent}% + ${pixels}px)`;
}
