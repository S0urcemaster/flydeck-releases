import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { appComponentNames } from "../config/componentManifest";
import {
  LabApp,
  persistSelectedAppComponent,
  readResponseError,
  readSelectedAppComponent,
  selectTheme,
} from "./LabApp";

describe("AppTitle lab", () => {
  it("shows the selected theme colors below the theme buttons", () => {
    const markup = renderToStaticMarkup(<LabApp />);

    expect(markup).toContain('aria-label="Flydeck V2 colors"');
    expect(markup).toContain(">Flydeck V1</button>");
    expect(markup).toContain("Page");
    expect(markup).toContain("#b9b9b9ff");
  });

  it("exposes AppTitle symbol and subtitle corrections in the props text", () => {
    const markup = renderToStaticMarkup(<LabApp />);

    expect(markup).toContain("symbolFontSize = ");
    expect(markup).toContain("symbol = ");
    expect(markup).toContain("titleTop = ");
    expect(markup).toContain("titleLeft = ");
    expect(markup).toContain("flydeckTitleTop = ");
    expect(markup).toContain("flydeckTitleLeft = ");
    expect(markup).toContain("symbolTop = ");
    expect(markup).toContain("symbolLeft = ");
    expect(markup).toContain("subtitleFontSize = ");
    expect(markup).toContain("subtitleTop = ");
    expect(markup).toContain("subtitleLeft = ");
    expect(markup.match(/visual offset without layout movement/g)).toHaveLength(2);
  });

  it("sorts catalogs and shades app components by composition depth", () => {
    const markup = renderToStaticMarkup(<LabApp />);

    expect(appComponentNames.every((name) => (
      markup.includes(`>${name}</button>`)
    ))).toBe(true);
    expect(markup).toContain("background:var(--color-component-depth-0)");
    expect(markup).toContain("background:var(--color-component-depth-1)");
    expect(markup).toContain("background:var(--color-component-depth-2)");
    expect(markup).toContain("background:var(--color-component-depth-3)");
    expect(markup).toContain("background:var(--color-component-depth-4)");
    expect(markup).toContain("AppTitle → Base");
    expect(markup.indexOf(">ColorMapEditor</button>")).toBeLessThan(
      markup.indexOf(">NumberInput</button>"),
    );
    expect(markup.indexOf(">NumberInput</button>")).toBeLessThan(
      markup.indexOf(">RgbColorField</button>"),
    );
    expect(markup.indexOf(">RgbColorField</button>")).toBeLessThan(
      markup.indexOf(">TokenEditor</button>"),
    );
    expect(markup.indexOf(">Flydeck</button>")).toBeLessThan(
      markup.indexOf(">Greyscale</button>"),
    );
  });

  it("toggles colors when the selected theme is clicked again", () => {
    expect(selectTheme("flydeck", "flydeck", true)).toEqual({
      selectedThemeId: "flydeck",
      showColors: false,
    });
    expect(selectTheme("flydeck", "flydeck", false)).toEqual({
      selectedThemeId: "flydeck",
      showColors: true,
    });
    expect(selectTheme("flydeck", "greyscale", false)).toEqual({
      selectedThemeId: "greyscale",
      showColors: true,
    });
  });

  it("restores and persists the last selected app component", () => {
    expect(readSelectedAppComponent({
      getItem: () => "DataModule",
    })).toBe("DataModule");
    expect(readSelectedAppComponent({
      getItem: () => "UnknownComponent",
    })).toBe("AppTitle");

    let stored = "";
    persistSelectedAppComponent("Textarea", {
      setItem: (_key, value) => {
        stored = value;
      },
    });
    expect(stored).toBe("Textarea");
  });

  it("keeps Checkbox font size out of the inherited Button properties", () => {
    persistSelectedAppComponent("Checkbox");
    const markup = renderToStaticMarkup(<LabApp />);
    const textarea = markup.indexOf(
      '<textarea aria-label="Inherited Base properties"',
    );
    const start = markup.indexOf("# component: Checkbox", textarea);
    const end = markup.indexOf("</textarea>", start);
    const properties = markup.slice(start, end);
    const inheritedButtonStart = properties.indexOf("# inherited: Button");
    const inheritedBaseStart = properties.indexOf(
      "# inherited: Base",
      inheritedButtonStart,
    );
    const inheritedButtonProperties = properties.slice(
      inheritedButtonStart,
      inheritedBaseStart,
    );

    expect(properties).not.toContain("Inherited Button CSS font-size");
    expect(inheritedButtonProperties).not.toContain("fontSize =");
    persistSelectedAppComponent("AppTitle");
  });

  it("renders isolated previews for the components added to the manifest", () => {
    const names = [
      "AppView",
      "BackspaceButton",
      "CompassApp",
      "ConfigEditor",
      "ContentEditor",
      "DataSourceInput",
      "DataTree",
      "DeviceInfoView",
      "DialButton",
      "DialSurface",
      "Dialer",
      "InventoryApp",
      "ParentInput",
      "PressButton",
      "RootInputControl",
      "ShoppingListView",
    ] as const;

    for (const name of names) {
      persistSelectedAppComponent(name);
      const markup = renderToStaticMarkup(<LabApp />);
      expect(markup, name).toContain(`>${name}</h2>`);
    }

    persistSelectedAppComponent("AppTitle");
  });

  it("reports empty and JSON endpoint errors without a second parse failure", async () => {
    await expect(readResponseError(
      new Response("", { status: 500 }),
      "Apply failed.",
    )).resolves.toBe(
      "Apply failed. HTTP 500. Restart the V2 development server.",
    );
    await expect(readResponseError(
      new Response('{"error":"Invalid font size."}', { status: 400 }),
      "Apply failed.",
    )).resolves.toBe("Invalid font size.");
  });
});
