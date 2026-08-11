import { DeviceInfo, type DeviceInfoProps } from "../DeviceInfo";
import { AppView, type AppViewProps } from "../AppView";

export type DeviceInfoViewProps = Omit<
  AppViewProps,
  "children" | "componentName" | "title"
> & {
  deviceInfoProps?: DeviceInfoProps;
};

export function DeviceInfoView({
  deviceInfoProps,
  ...appViewProps
}: DeviceInfoViewProps) {
  return (
    <AppView
      {...appViewProps}
      componentName="DeviceInfoView"
      title="DEVICEINFO"
    >
      <DeviceInfo {...deviceInfoProps} showRefreshButton={false} />
    </AppView>
  );
}
