import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("exposes its viewport and safe-area contract", () => {
    const shell = AppShell({
      title: "Flydeck",
      padding: "APP_INSET",
      margin: "0 auto",
      respectSafeArea: false,
      viewport: "container",
    });

    expect(isValidElement(shell)).toBe(true);
    expect(shell.props["data-safe-area"]).toBe(false);
    expect(shell.props["data-viewport"]).toBe("container");
    expect(shell.props.style["--app-shell-padding"]).toBe("var(--app-inset)");
    expect(shell.props.margin).toBe("0 auto");
  });
});
