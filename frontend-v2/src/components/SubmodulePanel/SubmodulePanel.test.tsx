import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { distributeSubmoduleItems, SubmodulePanel } from "./SubmodulePanel";

describe("SubmodulePanel", () => {
  it("renders CHAT and MEMO with inherited button height", () => {
    const markup = renderToStaticMarkup(
      <SubmodulePanel
        activeItem="MEMO"
        buttonProps={{ height: "40px", width: "44px" }}
        onChange={() => undefined}
      />,
    );
    expect(markup).toContain("CHAT");
    expect(markup).toContain("MEMO");
    expect(markup.match(/height:40px/g)).toHaveLength(2);
    expect(markup.match(/width:100%/g)).toHaveLength(2);
    expect(markup).toContain('data-columns="2"');
  });

  it("fills rows with three tabs first and two tabs when needed", () => {
    expect(distributeSubmoduleItems([1, 2, 3, 4, 5])).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
    expect(distributeSubmoduleItems([1, 2, 3, 4])).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(distributeSubmoduleItems([1, 2, 3, 4, 5, 6, 7])).toEqual([
      [1, 2, 3],
      [4, 5],
      [6, 7],
    ]);
  });
});
