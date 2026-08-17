import {
  RootInputControl,
  type RootInputControlProps,
} from "../RootInputControl";

export type DataSourceInputProps = Omit<
  RootInputControlProps,
  | "actionDisabled"
  | "actionLabel"
  | "allowUnresolvedActionTarget"
  | "componentName"
  | "onAction"
  | "valueValid"
> & {
  valid?: boolean;
  onSetDataSource?: (dataSource: string) => void;
};

export function DataSourceInput({
  valid,
  onSetDataSource,
  ...rootInputProps
}: DataSourceInputProps) {
  const normalizedValue = rootInputProps.value.trim();

  return (
    <RootInputControl
      {...rootInputProps}
      actionDisabled={dataSourceActionDisabled(
        normalizedValue,
        rootInputProps.current.path,
        valid,
      )}
      actionLabel="Set Datasource"
      allowUnresolvedActionTarget
      componentName="DataSourceInput"
      label="Datasource"
      valueValid={valid}
      onAction={() => onSetDataSource?.(normalizedValue)}
    />
  );
}

export function dataSourceActionDisabled(
  value: string,
  currentPath: string,
  valid: boolean | undefined,
) {
  return !value || value === currentPath || valid !== true;
}
