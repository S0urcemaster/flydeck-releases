import { DataTree, type DataTreeProps } from "../../components/DataTree";
import { Module, type ModuleProps } from "../../components/Module";

export type DataModuleProps = ModuleProps & {
  dataBrowserProps?: DataTreeProps;
};

export function DataModule({ dataBrowserProps, ...props }: DataModuleProps) {
  return (
    <Module {...props} componentName="DataModule" aria-label="Data module">
      <DataTree {...dataBrowserProps} />
    </Module>
  );
}
