import { useState } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { DataSourceInput, type DataSourceInputProps } from "../DataSourceInput";
import styles from "./ConfigEditor.module.css";

export type ConfigEditorProps = BaseStyleProps & {
  dataSource: string;
  dataSourceStatus?: "valid" | "invalid" | null;
  dataSourceInputProps?: DataSourceInputProps["inputProps"];
  dataSourceButtonProps?: DataSourceInputProps["buttonProps"];
  dataSourceBaseProps?: BaseStyleProps;
  onDataSourceChange?: (dataSource: string) => void;
};

export function ConfigEditor({
  dataSource,
  dataSourceStatus,
  dataSourceInputProps,
  dataSourceButtonProps,
  dataSourceBaseProps,
  onDataSourceChange,
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
    </Base>
  );
}
