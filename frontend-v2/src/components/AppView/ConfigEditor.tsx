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
  validateDataSource?: (dataSource: string) => boolean;
};

export function ConfigEditor({
  dataSource,
  dataSourceStatus,
  dataSourceInputProps,
  dataSourceButtonProps,
  dataSourceBaseProps,
  onDataSourceChange,
  validateDataSource,
  ...baseProps
}: ConfigEditorProps) {
  const [draft, setDraft] = useState(dataSource);
  const normalizedDraft = draft.trim();
  const draftStatus = validateDataSource && normalizedDraft
    ? validateDataSource(normalizedDraft) ? "valid" : "invalid"
    : draft === dataSource ? dataSourceStatus : null;
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
        valid={draftStatus === "valid"}
        value={draft}
        onChange={setDraft}
        onSetDataSource={onDataSourceChange}
      />
      {draftStatus && (
        <div
          className={draftStatus === "valid" ? styles.success : styles.error}
          role="status"
        >
          {draftStatus === "valid"
            ? "Datasource branch found."
            : "Datasource branch not found."}
        </div>
      )}
    </Base>
  );
}
