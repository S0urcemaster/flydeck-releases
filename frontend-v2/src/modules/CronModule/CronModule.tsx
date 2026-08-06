import { Module, type ModuleProps } from "../../components/Module";
import {
  CronDialer,
} from "../../components/CronDialer";
import type {
  DialerButtonProps,
  DialerCenterButtonProps,
} from "../../components/Dialer";

export type CronModuleProps = ModuleProps & {
  dialerButtonProps?: DialerButtonProps;
  dialerCenterButtonProps?: DialerCenterButtonProps;
};

export function CronModule({
  children,
  dialerButtonProps,
  dialerCenterButtonProps,
  ...props
}: CronModuleProps) {
  return (
    <Module {...props} componentName="CronModule" aria-label="Cron module">
      <CronDialer
        buttonProps={dialerButtonProps}
        centerButtonProps={dialerCenterButtonProps}
      />
      {children}
    </Module>
  );
}
