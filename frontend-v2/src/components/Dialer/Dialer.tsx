import {
  useState,
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
  getValue?: (state: Omit<DialerState<TValue>, "selectedValue">) => TValue;
  getInnerAngle?: (angle: number) => number;
  innerAngle?: number;
  initialInnerAngle?: number;
  initialOuterAngle?: number;
  innerScale?: (state: DialerState<TValue>) => ReactNode;
  innerMarker?: (state: DialerState<TValue>) => ReactNode;
  onInnerInput?: (input: DialTangentialInput) => void;
  onOuterInput?: (input: DialTangentialInput) => void;
  onValue?: (value: TValue) => void;
  outerAngle?: number;
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
  className,
  getValue,
  getInnerAngle,
  innerAngle: controlledInnerAngle,
  initialInnerAngle = 0,
  initialOuterAngle = 0,
  innerScale,
  innerMarker,
  onInnerInput,
  onOuterInput,
  onValue,
  outerAngle: controlledOuterAngle,
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
    const nextInput = {
      ...input,
      angle: getInnerAngle?.(input.angle) ?? input.angle,
    };
    setInnerAngle(nextInput.angle);
    setInnerPhase(input.phase);
    onInnerInput?.(nextInput);
  }

  function handleOuterInput(input: DialTangentialInput) {
    setOuterAngle(input.angle);
    setOuterPhase(input.phase);
    onOuterInput?.(input);

    if (input.phase !== selectionPhase) {
      return;
    }

    const value = getValue
      ? getValue({
          innerAngle,
          innerPhase,
          outerAngle: input.angle,
          outerPhase: input.phase,
        })
      : input.angle as TValue;
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
        layer="outer"
        aria-label="Outer dial"
        data-angle-origin="north"
        data-dial-reference="range-boundary"
        position={positionFromAngle(outerAngle)}
        marker={outerMarker?.(state)}
        onTangentialInput={handleOuterInput}
      >
        {outerScale?.(state)}
      </DialSurface>
      <DialSurface
        layer="inner"
        aria-label="Inner dial"
        data-angle-origin="north"
        data-dial-reference="zero-point"
        position={positionFromAngle(innerAngle)}
        marker={innerMarker?.(state)}
        onTangentialInput={handleInnerInput}
      >
        {innerScale?.(state)}
      </DialSurface>

      <DialerCenterButton
        {...buttonProps}
        {...resolvedCenterButtonProps}
        className={styles.centerButton}
        aria-label="Dial center"
      >
        {resolvedCenterLabel}
      </DialerCenterButton>
    </Base>
  );
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
