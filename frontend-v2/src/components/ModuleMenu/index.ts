export const moduleMenuItems = [
  "AGNT",
  "DATA",
  "FUNC",
  "CRON",
  "HELP",
  "CONFIG",
] as const;

export type ModuleMenuItem = typeof moduleMenuItems[number];
