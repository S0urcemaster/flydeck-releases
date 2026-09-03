import { DataBrowser, type DataBrowserProps } from "../DataBrowser";

export type DataTreeProps = DataBrowserProps;

export function DataTree({ workspaceId, ...props }: DataTreeProps) {
  return (
    <DataBrowser
      {...props}
      componentName="DataTree"
      contentHeightScale={1.5}
      contentPageSize={7}
      itemRenameVisible={false}
      workspaceId={workspaceId}
      canDeleteNode={(node, parent) => {
        if (node.kind === "trash-directory") return false;
        if (node.kind === "system-directory") return true;
        return parent?.kind === "trash-directory" || parent?.listEditable !== false;
      }}
      canMoveNode={(node, direction, siblings) => {
        if (node.kind === "trash-directory") return false;
        const neighbour = siblings[siblings.indexOf(node) + direction];
        return neighbour?.kind !== "trash-directory";
      }}
    />
  );
}
