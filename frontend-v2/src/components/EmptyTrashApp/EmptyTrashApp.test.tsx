import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyTrashApp, formatEmptyTrashStatus } from "./EmptyTrashApp";

describe("EmptyTrashApp", () => {
  it("renders an armed empty-trash action", () => {
    const markup = renderToStaticMarkup(<EmptyTrashApp workspaceId="00000000-0000-4000-8000-000000000001" />);
    expect(markup).toContain('data-component-name="EmptyTrashApp"');
    expect(markup).toContain('data-component-name="DeleteButton"');
    expect(markup).toContain("EMPTY TRASH");
  });

  it("describes empty and populated trash", () => {
    expect(formatEmptyTrashStatus("ready", 0)).toBe("Ready : trash is empty");
    expect(formatEmptyTrashStatus("ready", 2)).toBe("Ready : 2 trash items");
  });
});
