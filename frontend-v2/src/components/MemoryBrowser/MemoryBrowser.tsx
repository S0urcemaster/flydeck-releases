import {
  TreeBrowser,
  type TreeBrowserProps,
} from "../TreeBrowser";

export type MemoryBrowserProps<TContent = unknown> = Omit<
  TreeBrowserProps<TContent>,
  "componentName"
>;

export function MemoryBrowser<TContent = unknown>(
  props: MemoryBrowserProps<TContent>,
) {
  return (
    <TreeBrowser
      {...props}
      componentName="MemoryBrowser"
      browserLabel="Memory browser"
    />
  );
}
