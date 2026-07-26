import { useEffect, useState } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  defaultUiConfig,
  getConfigValue,
  normalizeUiConfig,
  uiConfigStorageKey,
} from "../../config/uiConfig";

export function useUiSettings() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useLocalStorage(
    uiConfigStorageKey,
    defaultUiConfig,
    (value) => normalizeUiConfig(value, true),
  );
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    document.documentElement.dataset.theme =
      getConfigValue(config, "theme").toLowerCase() === "flydeck" ? "flydeck" : "greyscale";
  }, [config]);

  function close() {
    const nextConfig = normalizeUiConfig(draft, false);
    if (nextConfig && getConfigValue(nextConfig, "localstorage-reset") === "true") {
      window.localStorage.clear();
      window.localStorage.setItem(uiConfigStorageKey, JSON.stringify(defaultUiConfig));
      window.location.reload();
      return;
    }
    if (nextConfig) setConfig(nextConfig);
    setDraft(nextConfig ?? config);
    setOpen(false);
  }

  function toggle() {
    if (open) close();
    else {
      setDraft(config);
      setOpen(true);
    }
  }

  return {
    open,
    config,
    draft,
    setDraft,
    close,
    toggle,
  };
}
