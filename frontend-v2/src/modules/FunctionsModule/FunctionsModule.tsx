import { useState } from "react";

import { CompassView } from "../../components/CompassView";
import { DeviceInfoView } from "../../components/DeviceInfoView";
import { ShoppingListView } from "../../components/ShoppingListView";
import {
  FunctionBrowser,
  type FunctionBrowserOutputState,
  type FunctionBrowserProps,
} from "../../components/FunctionBrowser";
import { Module, type ModuleProps } from "../../components/Module";

export type FunctionsModuleProps = ModuleProps & {
  functionBrowserProps?: FunctionBrowserProps;
};

export function FunctionsModule({
  functionBrowserProps,
  ...props
}: FunctionsModuleProps) {
  const [output, setOutput] = useState<FunctionBrowserOutputState>({
    categories: [],
    compassActive: false,
    deviceInfoActive: false,
    shoppingListActive: false,
    shoppingCategories: [],
  });

  return (
    <Module
      {...props}
      componentName="FunctionsModule"
      aria-label="Functions module"
    >
      {output.deviceInfoActive ? <DeviceInfoView key="device-info-view" /> : null}
      {output.compassActive
        ? (
            <CompassView
              key="compass-view"
              categories={output.categories}
            />
          )
        : null}
      {output.shoppingListActive
        ? (
            <ShoppingListView
              key="shopping-list-view"
              categories={output.shoppingCategories}
            />
          )
        : null}
      <FunctionBrowser
        {...functionBrowserProps}
        key="function-browser"
        onOutputChange={setOutput}
      />
    </Module>
  );
}
