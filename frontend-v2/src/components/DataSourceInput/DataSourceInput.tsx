import {
  RootInputControl,
  type RootInputControlProps,
} from "../RootInputControl";

export type DataSourceInputProps = Omit<
  RootInputControlProps,
  "actionDisabled" | "actionLabel" | "componentName" | "onAction"
> & {
  onSetDataSource?: (dataSource: string) => void;
};

export function DataSourceInput({
  onSetDataSource,
  ...rootInputProps
}: DataSourceInputProps) {
  return (
    <RootInputControl
      {...rootInputProps}
      actionDisabled={!rootInputProps.value.trim()
        || rootInputProps.value === rootInputProps.current.path}
      actionLabel="Set Datasource"
      componentName="DataSourceInput"
      label="Datasource"
      onAction={(value) => onSetDataSource?.(value)}
    />
  );
}
