import { useState } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { CycleButton, type CycleButtonProps } from "../CycleButton";
import { DataSourceInput, type DataSourceInputProps } from "../DataSourceInput";
import type { AppViewHeight } from "./AppView";
import styles from "./ConfigEditor.module.css";

export type ConfigEditorProps = BaseStyleProps & {
  appHeight?: AppViewHeight;
  dataSource: string;
  dataSourceStatus?: "valid" | "invalid" | null;
  dataSourceInputProps?: DataSourceInputProps["inputProps"];
  dataSourceButtonProps?: DataSourceInputProps["buttonProps"];
  dataSourceBaseProps?: BaseStyleProps;
  cycleButtonProps?: Omit<
    CycleButtonProps,
    "aria-label" | "onChange" | "options" | "value"
  >;
  onDataSourceChange?: (dataSource: string) => void;
  onAppHeightChange?: (height: AppViewHeight) => void;
};

export function ConfigEditor({
  appHeight = "S",
  dataSource,
  dataSourceStatus,
  dataSourceInputProps,
  dataSourceButtonProps,
  dataSourceBaseProps,
  cycleButtonProps,
  onDataSourceChange,
  onAppHeightChange,
  ...baseProps
}: ConfigEditorProps) {
  const [draft, setDraft] = useState(dataSource);
  const source = {
    id: dataSource,
    label: dataSource,
    path: dataSource,
    eligible: true,
  };

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName="ConfigEditor"
    >
      <DataSourceInput
        {...dataSourceBaseProps}
        buttonProps={dataSourceButtonProps}
        current={source}
        inputProps={dataSourceInputProps}
        targets={[source]}
        value={draft}
        onChange={setDraft}
        onSetDataSource={onDataSourceChange}
      />
      {dataSourceStatus && (
        <div
          className={dataSourceStatus === "valid" ? styles.success : styles.error}
          role="status"
        >
          {dataSourceStatus === "valid"
            ? "Datasource branch found."
            : "Datasource branch not found."}
        </div>
      )}
      <div className={styles.setting}>
        <span>App Height</span>
        <CycleButton
          {...cycleButtonProps}
          aria-label={`App Height ${appHeight}`}
          options={["S", "M", "L"]}
          value={appHeight}
          onChange={(value) => onAppHeightChange?.(value as AppViewHeight)}
        />
      </div>
      <div className={styles.placeholder} aria-hidden="true" />
    </Base>
  );
}
