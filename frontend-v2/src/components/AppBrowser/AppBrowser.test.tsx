import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppBrowser } from "./AppBrowser";

describe("AppBrowser", () => {
  it("starts with apps and _system directly in the root list", () => {
    const markup = renderToStaticMarkup(<AppBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="AppBrowser"');
    expect(markup).not.toContain(">Compass</button>");
    expect(markup).not.toContain(">Inventory</button>");
    expect(markup).not.toContain(">ShoppingList</button>");
    expect(markup).toContain("Bluesky");
    expect(markup).not.toContain(">Widgets</button>");
    expect(markup).not.toContain(">User</button>");
    expect(markup).not.toContain('aria-label="DeviceInfo result"');
    expect(markup).toContain('aria-label="Create child in root" disabled=""');
  });

  it("renders Backup inline beneath its System item", () => {
    const markup = renderToStaticMarkup(
      <AppBrowser
        initialSelectedPath={["_system", "backup"]}
        workspaceId="00000000-0000-4000-8000-000000000001"
      />,
    );

    expect(markup).toContain(">Backup</button>");
    expect(markup).toContain('data-component-name="BackupApp"');
    expect(markup.indexOf(">Backup</button>")).toBeLessThan(
      markup.indexOf('data-component-name="BackupApp"'),
    );
  });

  it("renders Device Info inline in a scroller beneath its System item", () => {
    const markup = renderToStaticMarkup(
      <AppBrowser initialSelectedPath={["_system", "device-info"]} />,
    );

    expect(markup).toContain(">Device Info</button>");
    expect(markup).toContain('aria-label="DeviceInfo result"');
    expect(markup).not.toContain('data-component-name="DeviceInfoView"');
  });

  it("orders the System utilities by destructive scope", () => {
    const markup = renderToStaticMarkup(
      <AppBrowser initialSelectedPath={["_system"]} />,
    );

    expect(markup).toContain(">Maintenance</button>");
    expect(markup).toContain(">Empty trash</button>");
    expect(markup.indexOf(">Empty trash</button>"))
      .toBeLessThan(markup.indexOf(">Backup</button>"));
    expect(markup.indexOf(">Backup</button>"))
      .toBeLessThan(markup.indexOf(">Maintenance</button>"));
    expect(markup.indexOf(">Maintenance</button>"))
      .toBeLessThan(markup.indexOf(">Device Info</button>"));
  });

  it("renders Empty trash inline beneath its System item", () => {
    const markup = renderToStaticMarkup(
      <AppBrowser
        initialSelectedPath={["_system", "empty-trash"]}
        workspaceId="00000000-0000-4000-8000-000000000001"
      />,
    );

    expect(markup).toContain('data-component-name="EmptyTrashApp"');
    expect(markup).toContain('data-component-name="DeleteButton"');
  });

});
