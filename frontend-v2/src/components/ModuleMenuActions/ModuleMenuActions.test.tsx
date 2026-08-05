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
        onChange={() => undefined}
      />,
    );

    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
});
