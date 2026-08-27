import { DataTree, type DataTreeProps } from "../../components/DataTree";
import { Module, type ModuleProps } from "../../components/Module";
import styles from "./DataModule.module.css";

export type DataModuleProps = ModuleProps & {
  dataBrowserProps?: DataTreeProps;
};

export function DataModule({ dataBrowserProps, ...props }: DataModuleProps) {
  return (
    <Module {...props} componentName="DataModule" aria-label="Data module">
      <DataTree {...dataBrowserProps} />
      <div className={styles.bottomSpacer} aria-hidden="true" />
    </Module>
  );
}
