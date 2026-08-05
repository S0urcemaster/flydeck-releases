import type { ModuleMenuItem } from "../components/ModuleMenu";

export const primaryModuleItems = ["AGNT", "DATA", "FUNC", "CRON"] as const;
export type PrimaryModuleItem = typeof primaryModuleItems[number];
export type ModuleActionItem = Extract<ModuleMenuItem, "HELP" | "CONFIG">;

export function isPrimaryModuleItem(
  item: ModuleMenuItem,
): item is PrimaryModuleItem {
  return primaryModuleItems.includes(item as PrimaryModuleItem);
}

export function toggleModuleAction(
  activeItem: ModuleMenuItem,
  actionItem: ModuleActionItem,
  previousPrimaryItem: PrimaryModuleItem,
): ModuleMenuItem {
  return activeItem === actionItem ? previousPrimaryItem : actionItem;
}
