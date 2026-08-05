import { Module, type ModuleProps } from "../../components/Module";

export type SettingsModuleProps = ModuleProps;

export function SettingsModule(props: SettingsModuleProps) {
  return (
    <Module
      {...props}
      componentName="SettingsModule"
      aria-label="Settings module"
    />
  );
}
