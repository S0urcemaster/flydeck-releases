import { Module, type ModuleProps } from "../../components/Module";
import {
  CronDialer,
  type CronDialerProps,
  type CronDialerScaleProps,
} from "../../components/CronDialer";
import type {
  DialerButtonProps,
  DialerCenterButtonProps,
} from "../../components/Dialer";

export type CronModuleProps = ModuleProps & {
  dialerButtonProps?: DialerButtonProps;
  dialerCenterButtonProps?: DialerCenterButtonProps;
  dialerProps?: Omit<
    CronDialerProps & CronDialerScaleProps,
    "buttonProps" | "centerButtonProps"
  >;
};

export function CronModule({
  children,
  dialerButtonProps,
  dialerCenterButtonProps,
  dialerProps,
  ...props
}: CronModuleProps) {
  return (
    <Module {...props} componentName="CronModule" aria-label="Cron module">
      <CronDialer
        {...dialerProps}
        buttonProps={dialerButtonProps}
        centerButtonProps={dialerCenterButtonProps}
      />
      {children}
    </Module>
  );
}
