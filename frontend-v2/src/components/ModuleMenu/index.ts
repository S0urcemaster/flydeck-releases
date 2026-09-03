export const moduleMenuItems = [
  "AGNT",
  "DATA",
  "DATB",
  "DATC",
  "DATD",
  "FUNC",
  "HELP",
  "CONFIG",
] as const;

export type ModuleMenuItem = typeof moduleMenuItems[number];
