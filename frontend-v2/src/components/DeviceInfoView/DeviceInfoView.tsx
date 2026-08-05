import { DeviceInfo, type DeviceInfoProps } from "../DeviceInfo";
import { FunctionView, type FunctionViewProps } from "../FunctionView";

export type DeviceInfoViewProps = Omit<
  FunctionViewProps,
  "children" | "componentName" | "title"
> & {
  deviceInfoProps?: DeviceInfoProps;
};

export function DeviceInfoView({
  deviceInfoProps,
  ...functionViewProps
}: DeviceInfoViewProps) {
  return (
    <FunctionView
      {...functionViewProps}
      componentName="DeviceInfoView"
      title="DEVICEINFO"
    >
      <DeviceInfo {...deviceInfoProps} showRefreshButton={false} />
    </FunctionView>
  );
}
