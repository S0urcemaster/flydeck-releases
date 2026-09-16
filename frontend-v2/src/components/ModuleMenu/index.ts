export const moduleMenuItems = [
  "AGNT",
  "DATA",
  "LENS",
  "FUNC",
  "HELP",
  "CONFIG",
] as const;

export type ModuleMenuItem = typeof moduleMenuItems[number];
