import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModuleMenuActions } from "./ModuleMenuActions";

describe("ModuleMenuActions", () => {
  it("shares one exclusive active item across its symbol controls", () => {
    const markup = renderToStaticMarkup(
      <ModuleMenuActions
        activeItem="HELP"
        configButtonProps={{ symbol: "⚙" }}
        helpButtonProps={{ symbol: "?" }}
        offlineButtonProps={{}}
        forcedOfflineMode={false}
        offline={false}
        pendingTransactions={0}
        onChange={() => undefined}
        onOfflineModeChange={() => undefined}
      />,
    );

    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup.indexOf("Offline test mode")).toBeLessThan(
      markup.indexOf('aria-label="Help"'),
    );
  });

  it("replaces the offline symbol with the pending transaction count", () => {
    const markup = renderToStaticMarkup(
      <ModuleMenuActions
        activeItem="DATA"
        configButtonProps={{ symbol: "⚙" }}
        helpButtonProps={{ symbol: "?" }}
        offlineButtonProps={{}}
        forcedOfflineMode
        offline
        pendingTransactions={4}
        onChange={() => undefined}
        onOfflineModeChange={() => undefined}
      />,
    );

    expect(markup).toContain("4 pending transactions");
    expect(markup).toMatch(/4<\/button>/);
  });

  it("shows the pending count for a real connection failure", () => {
    const markup = renderToStaticMarkup(
      <ModuleMenuActions
        activeItem="DATA"
        configButtonProps={{ symbol: "⚙" }}
        helpButtonProps={{ symbol: "?" }}
        offlineButtonProps={{}}
        forcedOfflineMode={false}
        offline
        pendingTransactions={2}
        onChange={() => undefined}
        onOfflineModeChange={() => undefined}
      />,
    );

    expect(markup).toContain("Offline: no connection, 2 pending transactions");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toMatch(/2<\/button>/);
    expect(markup).not.toContain("lucide-wifi-off");
  });
});
