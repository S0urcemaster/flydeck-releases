import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SubmodulePanel } from "./SubmodulePanel";

describe("SubmodulePanel", () => {
  it("renders CHAT and MEMO with inherited button height", () => {
    const markup = renderToStaticMarkup(
      <SubmodulePanel
        activeItem="MEMO"
        buttonProps={{ height: "40px" }}
        onChange={() => undefined}
      />,
    );
    expect(markup).toContain("CHAT");
    expect(markup).toContain("MEMO");
    expect(markup.match(/height:40px/g)).toHaveLength(2);
  });
});
