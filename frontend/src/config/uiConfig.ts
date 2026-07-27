import type {
  CharacterDialCornerAction,
  CharacterDialCorners,
  DwellMode,
} from "../components/CharacterDial";

export const uiConfigStorageKey = "flydeck.uiConfig";

const uiConfigDefaults = [
  "--MAIN--",
  "# preferred keyboard options: system, mobile, dialer",
  "preferred-keyboard : dialer",
  "",
  "--DISPLAY--",
  "# theme options: FLYDECK, GREYSCALE",
  "ui-font-size : 50",
  "ui-list-font-size : 50",
  "editor-fontsize-scale : 50",
  "ui-buttonheight-standard : 44",
  "ui-buttonheight-compact : 40",
  "theme : GREYSCALE",
  "",
  "--CHARACTER DIALER--",
  "# button options: CURRENTLETTER, BACKSPACE, ENTER, SPACE, TIME, DIALERSIZE, DWELL, or empty",
  "dialerinput-defaultsize : small",
  "dialerinput-dwell : off",
  "dialerinput-innerscale-size : 20",
  "dialerinput-outerscale-size : 30",
  "dialerinput-nwkey : CURRENTLETTER",
  "dialerinput-swkey : DIALERSIZE",
  "dialerinput-sekey : SPACE",
  "dialerinput-nekey : DWELL",
  "dialerinput-rightkey1 : BACKSPACE",
  "dialerinput-rightkey2 :",
  "dialerinput-rightkey3 :",
  "dialerinput-rightkey4 :",
  "dialerinput-rightkey5 :",
  "dialerinput-rightkey6 :",
  "dialerinput-rightkey7 : ENTER",
  "",
  "--MAINTENANCE--",
  "# set to true and apply to restore all local storage defaults",
  "localstorage-reset : false",
  "",
];

export const defaultUiConfig = uiConfigDefaults.join("\n");

export function normalizeUiConfig(value: unknown, addMissingDefaults: boolean) {
  if (typeof value !== "string") return null;
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const configLines = lines.filter((line) => !/^--[a-z][a-z ]*--$/i.test(line) && !line.startsWith("#"));
  const parsed = configLines.map((line) => /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/i.exec(line));
  if (parsed.some((entry) => !entry)) return null;
  const names = parsed.map((entry) => entry![1].toLowerCase());
  if (new Set(names).size !== names.length) return null;
  const normalizedValues = new Map<string, string>();
  for (const entry of parsed) {
    const name = entry![1].toLowerCase();
    const rawValue = entry![2].trim().toLowerCase();
    if (name === "theme-flydeck-active" || name === "theme-greyscale-active") {
      if (rawValue === "true") normalizedValues.set(name, "true");
      else if (rawValue === "" || rawValue === "false") normalizedValues.set(name, "");
      else return null;
      continue;
    }
    if (/^dialerinput-(nw|ne|sw|se)key$/.test(name) || /^dialerinput-rightkey[1-7]$/.test(name)) {
      const action = rawValue === "" ? "" : rawValue.toUpperCase();
      if (["", "BACKSPACE", "ENTER", "SPACE", "DIALERSIZE", "TIME", "DWELL", "CURRENTLETTER"].includes(action)) {
        normalizedValues.set(name, action);
      } else return null;
      continue;
    }
    if (name === "localstorage-reset") {
      if (rawValue === "true" || rawValue === "false") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "preferred-keyboard") {
      if (rawValue === "system" || rawValue === "mobile" || rawValue === "dialer") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "dialerinput-defaultsize") {
      if (rawValue === "small" || rawValue === "medium" || rawValue === "large") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "dialerinput-dwell") {
      if (rawValue === "off" || rawValue === "0.2" || rawValue === "0.3" || rawValue === "0.4") normalizedValues.set(name, rawValue);
      else if (rawValue === "0.5" || rawValue === "0.7") normalizedValues.set(name, "0.3");
      else return null;
      continue;
    }
    if (name === "dialerinput-innerscale-size" || name === "dialerinput-outerscale-size") {
      if (!/^\d{1,3}$/.test(rawValue)) return null;
      const numericValue = Number(rawValue);
      if (numericValue < 1 || numericValue > 100) return null;
      normalizedValues.set(name, String(numericValue));
      continue;
    }
    if (name === "preferred-hand") {
      if (rawValue === "right" || rawValue === "left") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "theme") {
      if (rawValue === "flydeck" || rawValue === "greyscale") normalizedValues.set(name, rawValue.toUpperCase());
      else return null;
      continue;
    }
    if (!/^\d{1,3}$/.test(rawValue)) return null;
    const numericValue = Number(rawValue);
    if (numericValue < 1 || numericValue > 100) return null;
    normalizedValues.set(name, String(numericValue));
  }
  if (!normalizedValues.has("theme")) {
    const legacyFlydeck = normalizedValues.get("theme-flydeck-active") === "true";
    normalizedValues.set("theme", legacyFlydeck ? "FLYDECK" : "GREYSCALE");
  }
  normalizedValues.delete("theme-flydeck-active");
  normalizedValues.delete("theme-greyscale-active");
  normalizedValues.delete("preferred-hand");
  normalizedValues.delete("ui-logo-size");
  normalizedValues.delete("ui-logo-position-x");
  normalizedValues.delete("ui-logo-position-y");
  const migratingFixedEditingKeys = !normalizedValues.has("dialerinput-rightkey6")
    && !normalizedValues.has("dialerinput-rightkey7");
  if (migratingFixedEditingKeys) {
    for (let index = 5; index >= 1; index -= 1) {
      normalizedValues.set(`dialerinput-rightkey${index + 1}`, normalizedValues.get(`dialerinput-rightkey${index}`) ?? "");
    }
    normalizedValues.set("dialerinput-rightkey1", "BACKSPACE");
    normalizedValues.set("dialerinput-rightkey7", "ENTER");
  }
  const migratingDwell = !normalizedValues.has("dialerinput-dwell");
  const defaultEntries = uiConfigDefaults
    .map((line) => /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/i.exec(line))
    .filter((entry): entry is RegExpExecArray => entry !== null);
  for (const entry of defaultEntries) {
    const name = entry[1].toLowerCase();
    if (!normalizedValues.has(name)) {
      if (!addMissingDefaults) return null;
      normalizedValues.set(name, entry[2].trim());
    }
  }
  if (migratingDwell && normalizedValues.get("dialerinput-nekey") === "") {
    normalizedValues.set("dialerinput-nekey", "DWELL");
  }
  if ([...normalizedValues.keys()].some((name) => !defaultEntries.some((entry) => entry[1].toLowerCase() === name))) return null;
  return uiConfigDefaults.map((line) => {
    const entry = /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/i.exec(line);
    if (!entry) return line;
    const name = entry[1].toLowerCase();
    return `${name} : ${normalizedValues.get(name) ?? ""}`.trimEnd();
  }).join("\n");
}

export function getConfigValue(config: string, name: string) {
  const entry = config.split("\n").map((line) => new RegExp(`^${name}\\s*:\\s*(.*)$`, "i").exec(line.trim())).find(Boolean);
  return entry?.[1].trim() ?? "";
}

export function getCharacterDialCorners(config: string): CharacterDialCorners {
  const read = (corner: "nw" | "ne" | "sw" | "se") =>
    getConfigValue(config, `dialerinput-${corner}key`) as CharacterDialCornerAction;
  return { nw: read("nw"), ne: read("ne"), sw: read("sw"), se: read("se") };
}

export function getCharacterDialRightButtons(config: string) {
  return Array.from({ length: 7 }, (_, index) =>
    getConfigValue(config, `dialerinput-rightkey${index + 1}`) as CharacterDialCornerAction);
}

export function getPreferredKeyboard(config: string): "system" | "mobile" | "dialer" {
  const value = getConfigValue(config, "preferred-keyboard");
  return value === "system" || value === "mobile" ? value : "dialer";
}

export function getDialerDefaultSize(config: string): "small" | "medium" | "large" {
  const value = getConfigValue(config, "dialerinput-defaultsize");
  return value === "medium" || value === "large" ? value : "small";
}

export function getDialerDefaultDwell(config: string): DwellMode {
  const value = getConfigValue(config, "dialerinput-dwell");
  return value === "0.2" || value === "0.3" || value === "0.4" ? value : "off";
}

export function getDialerScaleSize(config: string, scale: "inner" | "outer") {
  const value = Number(getConfigValue(config, `dialerinput-${scale}scale-size`));
  return Number.isFinite(value) && value >= 1 && value <= 100 ? value : scale === "inner" ? 20 : 30;
}

type UiNumericConfigName = "ui-font-size" | "ui-list-font-size" | "editor-fontsize-scale";

export function getUiFontScale(config: string, name: UiNumericConfigName) {
  const entry = config.split("\n").map((line) => new RegExp(`^${name}\\s*:\\s*(\\d+)$`, "i").exec(line.trim())).find(Boolean);
  const value = entry ? Number(entry[1]) : 50;
  if (value <= 50) return 0.5 + ((value - 1) / 49) * 0.5;
  return 1 + ((value - 50) / 50);
}

export function getUiButtonHeight(config: string, kind: "standard" | "compact") {
  const fallback = kind === "standard" ? 44 : 40;
  const value = Number(getConfigValue(config, `ui-buttonheight-${kind}`));
  return Number.isFinite(value) && value >= 22 && value <= 100 ? value : fallback;
}
