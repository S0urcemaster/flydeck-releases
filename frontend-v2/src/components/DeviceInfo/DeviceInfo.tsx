import { useEffect, useState } from "react";

import { Base, type BaseStyleProps } from "../Base";
import {
  DeviceInfoButton,
  type DeviceInfoButtonProps,
} from "../DeviceInfoButton";
import { Textarea } from "../Textarea";
import { collectDeviceInfo, formatDeviceInfo } from "./deviceInfo";
import styles from "./DeviceInfo.module.css";

export type DeviceInfoProps = BaseStyleProps & {
  showRefreshButton?: boolean;
  textareaProps?: BaseStyleProps;
  buttonProps?: Omit<DeviceInfoButtonProps, "children" | "onClick" | "selected">;
};

export function DeviceInfo({
  color,
  background,
  border,
  padding,
  margin,
  width,
  height,
  textareaProps,
  buttonProps,
  showRefreshButton = true,
}: DeviceInfoProps = {}) {
  const [result, setResult] = useState("Collecting client information…");

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const info = await collectDeviceInfo();
      if (active) {
        setResult(formatDeviceInfo(info));
      }
    };

    void refresh();
    window.addEventListener("resize", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.visualViewport?.addEventListener("resize", refresh);

    return () => {
      active = false;
      window.removeEventListener("resize", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
    };
  }, []);

  async function refresh() {
    setResult(formatDeviceInfo(await collectDeviceInfo()));
  }

  return (
    <Base
      as="section"
      className={styles.root}
      componentName="DeviceInfo"
      aria-label="Device information"
      color={color}
      background={background}
      border={border}
      padding={padding}
      margin={margin}
      width={width}
      height={height}
      data-show-refresh-button={showRefreshButton}
    >
      {showRefreshButton && (
        <div className={styles.actions}>
          <DeviceInfoButton {...buttonProps} selected onClick={refresh}>
            DEVICEINFO
          </DeviceInfoButton>
        </div>
      )}
      <Textarea
        {...textareaProps}
        aria-label="DeviceInfo result"
        readOnly
        resize="none"
        size="large"
        value={result}
      />
    </Base>
  );
}
