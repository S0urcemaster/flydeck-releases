import { DataBrowser, type DataBrowserProps } from "../DataBrowser";

export type DataTreeProps = DataBrowserProps;

export function DataTree({ workspaceId, ...props }: DataTreeProps) {
  return (
    <DataBrowser
      {...props}
      componentName="DataTree"
      workspaceId={workspaceId}
      canDeleteNode={(node, parent) => {
        if (node.kind === "system-directory" || node.kind === "trash-directory") {
          return false;
        }
        return parent?.kind === "trash-directory" || parent?.listEditable !== false;
      }}
      canMoveNode={(node, direction, siblings) => {
        if (node.kind === "system-directory" || node.kind === "trash-directory") return false;
        const neighbour = siblings[siblings.indexOf(node) + direction];
        return neighbour?.kind !== "system-directory" && neighbour?.kind !== "trash-directory";
      }}
    />
  );
}
