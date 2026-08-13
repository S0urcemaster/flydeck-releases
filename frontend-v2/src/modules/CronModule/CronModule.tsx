import { Module, type ModuleProps } from "../../components/Module";
import { CronDialer, type CronDialerProps } from "../../components/CronDialer";
import {
  DialerButtonProps,
  DialerCenterButtonProps,
} from "../../components/Dialer";

export type CronModuleProps = ModuleProps & {
  dialerButtonProps?: DialerButtonProps;
  dialerCenterButtonProps?: DialerCenterButtonProps;
  dialerProps?: Omit<
    CronDialerProps,
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
