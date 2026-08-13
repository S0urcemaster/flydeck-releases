import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Base, type BaseProps } from "../Base";
import {
  DialerButton,
  type DialerButtonProps as BaseDialerButtonProps,
} from "../DialerButton";
import {
  DialerCenterButton,
  type DialerCenterButtonProps as BaseDialerCenterButtonProps,
} from "../DialerCenterButton";
import {
  DialSurface,
  type DialInputPhase,
  type DialPosition,
  type DialSurfaceProps,
  type DialTangentialInput,
} from "../DialSurface";
import styles from "./Dialer.module.css";

export type DialerButtonProps = Omit<
  BaseDialerButtonProps,
  "children" | "className" | "onClick"
>;

export type DialerCenterButtonProps = Omit<
  BaseDialerCenterButtonProps,
  "children" | "className"
>;

export type DialerSelectionPhase = Extract<
  DialInputPhase,
  "press" | "release"
>;

export type DialerInteractionMode = "pointer" | "wheel";

export type DialerState<TValue> = {
  innerAngle: number;
  innerPhase: DialInputPhase | null;
  outerAngle: number;
  outerPhase: DialInputPhase | null;
  selectedValue: TValue | null;
};

export type DialerProps<TValue = number> = Omit<BaseProps<"div">, "as"> & {
  bottomLeftLabel: string;
  bottomRightLabel: string;
  buttonProps?: DialerButtonProps;
  centerLabel:
    | ReactNode
    | ((state: DialerState<TValue>) => ReactNode);
  centerButtonProps?:
    | DialerCenterButtonProps
    | ((state: DialerState<TValue>) => DialerCenterButtonProps);
  dialSurfaceProps?: Omit<
    DialSurfaceProps,
    "children" | "layer" | "marker" | "onTangentialInput" | "position"
  >;
  getValue?: (state: Omit<DialerState<TValue>, "selectedValue">) => TValue;
  getInnerAngle?: (angle: number) => number;
  getOuterAngle?: (angle: number, innerAngle: number) => number;
  innerAngle?: number;
  initialInnerAngle?: number;
  initialOuterAngle?: number;
  innerBackground?: string;
  interactionMode?: DialerInteractionMode;
  innerScale?: (state: DialerState<TValue>) => ReactNode;
  innerMarker?: (state: DialerState<TValue>) => ReactNode;
  onInnerInput?: (input: DialTangentialInput) => void;
  onOuterInput?: (input: DialTangentialInput) => void;
  onValue?: (value: TValue) => void;
  outerAngle?: number;
  outerBackground?: string;
  outerScale?: (state: DialerState<TValue>) => ReactNode;
  outerMarker?: (state: DialerState<TValue>) => ReactNode;
  selectionPhase?: DialerSelectionPhase;
  showCornerButtons?: boolean;
  topLeftLabel: string;
  topRightLabel: string;
};

export function Dialer<TValue = number>({
  bottomLeftLabel,
  bottomRightLabel,
  buttonProps,
  centerLabel,
  centerButtonProps,
  dialSurfaceProps,
  className,
  getValue,
  getInnerAngle,
  getOuterAngle,
  innerAngle: controlledInnerAngle,
  initialInnerAngle = 0,
  initialOuterAngle = 0,
  innerBackground,
  interactionMode = "pointer",
  innerScale,
  innerMarker,
  onInnerInput,
  onOuterInput,
  onValue,
  outerAngle: controlledOuterAngle,
  outerBackground,
  outerScale,
  outerMarker,
  selectionPhase = "release",
  showCornerButtons = true,
  topLeftLabel,
  topRightLabel,
  ...props
}: DialerProps<TValue>) {
  const [uncontrolledInnerAngle, setInnerAngle] = useState(initialInnerAngle);
  const [innerPhase, setInnerPhase] = useState<DialInputPhase | null>(null);
  const [uncontrolledOuterAngle, setOuterAngle] = useState(initialOuterAngle);
  const [outerPhase, setOuterPhase] = useState<DialInputPhase | null>(null);
  const [selectedValue, setSelectedValue] = useState<TValue | null>(null);
  const innerWheelGesture = useRef<WheelGesture | null>(null);
  const outerWheelGesture = useRef<WheelGesture | null>(null);
  const classes = className ? `${styles.root} ${className}` : styles.root;
  const innerAngle = controlledInnerAngle ?? uncontrolledInnerAngle;
  const outerAngle = controlledOuterAngle ?? uncontrolledOuterAngle;
  const state: DialerState<TValue> = {
    innerAngle,
    innerPhase,
    outerAngle,
    outerPhase,
    selectedValue,
  };
  const resolvedCenterLabel = typeof centerLabel === "function"
    ? centerLabel(state)
    : centerLabel;
  const resolvedCenterButtonProps = typeof centerButtonProps === "function"
    ? centerButtonProps(state)
    : centerButtonProps;

  function handleInnerInput(input: DialTangentialInput) {
    const inputAngle = interactionMode === "wheel"
      ? wheelSelectionAngle(input, innerAngle, innerWheelGesture)
      : input.angle;
    const nextInput = {
      ...input,
      angle: getInnerAngle?.(inputAngle) ?? inputAngle,
    };
    if (interactionMode === "wheel" && innerWheelGesture.current) {
      innerWheelGesture.current.selectionAngle = nextInput.angle;
    }
    setInnerAngle(nextInput.angle);
    setInnerPhase(input.phase);
    onInnerInput?.(nextInput);
  }

  function handleOuterInput(input: DialTangentialInput) {
    const inputAngle = interactionMode === "wheel"
      ? wheelSelectionAngle(input, outerAngle, outerWheelGesture)
      : input.angle;
    const nextAngle = getOuterAngle?.(inputAngle, innerAngle) ?? inputAngle;
    if (interactionMode === "wheel" && outerWheelGesture.current) {
      outerWheelGesture.current.selectionAngle = nextAngle;
    }
    const nextInput = { ...input, angle: nextAngle };
    setOuterAngle(nextAngle);
    setOuterPhase(input.phase);
    onOuterInput?.(nextInput);

    if (nextInput.phase !== selectionPhase) {
      return;
    }

    const value = getValue
      ? getValue({
          innerAngle,
          innerPhase,
          outerAngle: nextAngle,
          outerPhase: nextInput.phase,
        })
      : nextAngle as TValue;
    setSelectedValue(value);
    onValue?.(value);
  }

  return (
    <Base {...props} className={classes}>
      {showCornerButtons && (
        <div className={styles.cornerButtons}>
          <DialerButton {...buttonProps} className={styles.topLeft}>
            {topLeftLabel}
          </DialerButton>
          <DialerButton {...buttonProps} className={styles.topRight}>
            {topRightLabel}
          </DialerButton>
          <DialerButton {...buttonProps} className={styles.bottomLeft}>
            {bottomLeftLabel}
          </DialerButton>
          <DialerButton {...buttonProps} className={styles.bottomRight}>
            {bottomRightLabel}
          </DialerButton>
        </div>
      )}

      <DialSurface
        {...dialSurfaceProps}
        background={outerBackground}
        layer="outer"
        aria-label="Outer dial"
        data-angle-origin="north"
        data-dial-reference="range-boundary"
        position={positionFromAngle(interactionMode === "wheel" ? 0 : outerAngle)}
        marker={outerMarker?.(state)}
        onTangentialInput={handleOuterInput}
      >
        <span
          className={styles.scaleRotation}
          style={scaleRotationStyle(interactionMode, outerAngle)}
        >
          {outerScale?.(state)}
        </span>
      </DialSurface>
      <DialSurface
        {...dialSurfaceProps}
        background={innerBackground}
        layer="inner"
        aria-label="Inner dial"
        data-angle-origin="north"
        data-dial-reference="zero-point"
        position={positionFromAngle(interactionMode === "wheel" ? 0 : innerAngle)}
        marker={innerMarker?.(state)}
        onTangentialInput={handleInnerInput}
      >
        <span
          className={styles.scaleRotation}
          style={scaleRotationStyle(interactionMode, innerAngle)}
        >
          {innerScale?.(state)}
        </span>
      </DialSurface>

      <DialerCenterButton
        {...buttonProps}
        aria-label="Dial center"
        {...resolvedCenterButtonProps}
        className={styles.centerButton}
      >
        {resolvedCenterLabel}
      </DialerCenterButton>
    </Base>
  );
}

type WheelGesture = {
  pointerAngle: number;
  selectionAngle: number;
};

function wheelSelectionAngle(
  input: DialTangentialInput,
  selectionAngle: number,
  gestureRef: { current: WheelGesture | null },
) {
  if (input.phase === "press" || !gestureRef.current) {
    gestureRef.current = {
      pointerAngle: input.angle,
      selectionAngle,
    };
  }
  const gesture = gestureRef.current;
  const nextAngle = gesture.selectionAngle
    - signedAngleDelta(gesture.pointerAngle, input.angle);
  gestureRef.current = {
    pointerAngle: input.angle,
    selectionAngle: nextAngle,
  };
  if (input.phase === "release") gestureRef.current = null;
  return nextAngle;
}

export function signedAngleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function scaleRotationStyle(
  interactionMode: DialerInteractionMode,
  angle: number,
): CSSProperties | undefined {
  return interactionMode === "wheel"
    ? { transform: `rotate(${-angle}deg)` }
    : undefined;
}

export function positionFromAngle(angle: number): DialPosition {
  const radians = (angle - 90) * Math.PI / 180;
  const markerRadius = 0.94;
  return {
    x: Math.cos(radians) * markerRadius / 2 + 0.5,
    y: Math.sin(radians) * markerRadius / 2 + 0.5,
    radius: markerRadius,
    angle,
  };
}
