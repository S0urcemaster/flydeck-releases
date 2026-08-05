type NavigatorWithHints = Navigator & {
  connection?: {
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
    saveData?: boolean;
  };
  deviceMemory?: number;
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    mobile?: boolean;
    platform?: string;
  };
};

export async function collectDeviceInfo(): Promise<Record<string, unknown>> {
  const navigatorWithHints = navigator as NavigatorWithHints;
  const visualViewport = window.visualViewport;
  const orientation = window.screen.orientation;
  const storage = await readStorageEstimate();

  return {
    collectedAt: new Date().toISOString(),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availableWidth: window.screen.availWidth,
      availableHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      orientation: orientation
        ? { type: orientation.type, angle: orientation.angle }
        : null,
    },
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: window.devicePixelRatio,
      estimatedPhysicalWidth: Math.round(window.screen.width * window.devicePixelRatio),
      estimatedPhysicalHeight: Math.round(window.screen.height * window.devicePixelRatio),
    },
    visualViewport: visualViewport
      ? {
          width: round(visualViewport.width),
          height: round(visualViewport.height),
          scale: visualViewport.scale,
          offsetLeft: round(visualViewport.offsetLeft),
          offsetTop: round(visualViewport.offsetTop),
        }
      : null,
    safeArea: readSafeAreaInsets(),
    browser: {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      language: navigator.language,
      languages: navigator.languages,
      cookieEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
    },
    client: {
      platform: navigatorWithHints.userAgentData?.platform ?? navigator.platform,
      mobile: navigatorWithHints.userAgentData?.mobile ?? null,
      brands: navigatorWithHints.userAgentData?.brands ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGiB: navigatorWithHints.deviceMemory ?? null,
      maxTouchPoints: navigator.maxTouchPoints,
    },
    preferences: {
      colorScheme: mediaPreference("(prefers-color-scheme: dark)", "dark", "light"),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      highContrast: window.matchMedia("(prefers-contrast: more)").matches,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    network: navigatorWithHints.connection
      ? {
          effectiveType: navigatorWithHints.connection.effectiveType ?? null,
          downlinkMbps: navigatorWithHints.connection.downlink ?? null,
          roundTripTimeMs: navigatorWithHints.connection.rtt ?? null,
          saveData: navigatorWithHints.connection.saveData ?? null,
        }
      : null,
    storage,
  };
}

export function formatDeviceInfo(info: Record<string, unknown>): string {
  return JSON.stringify(info, null, 2);
}

async function readStorageEstimate() {
  if (!navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usageBytes: estimate.usage ?? null,
      quotaBytes: estimate.quota ?? null,
    };
  } catch {
    return null;
  }
}

function readSafeAreaInsets() {
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: style.paddingTop,
    right: style.paddingRight,
    bottom: style.paddingBottom,
    left: style.paddingLeft,
  };
  probe.remove();
  return insets;
}

function mediaPreference(query: string, matched: string, unmatched: string) {
  return window.matchMedia(query).matches ? matched : unmatched;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
