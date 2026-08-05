import {
  DataBrowser,
  type DataBrowserProps,
} from "../../components/DataBrowser";
import { Module, type ModuleProps } from "../../components/Module";

export type DataModuleProps = ModuleProps & {
  dataBrowserProps?: DataBrowserProps;
};

export function DataModule({ dataBrowserProps, ...props }: DataModuleProps) {
  return (
    <Module {...props} componentName="DataModule" aria-label="Data module">
      <DataBrowser {...dataBrowserProps} />
    </Module>
  );
}
