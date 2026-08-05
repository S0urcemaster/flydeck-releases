import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SynchronizationDialog } from "./SynchronizationDialog";

describe("SynchronizationDialog", () => {
  it("explains waiting and offers explicit unsynchronized continuation", () => {
    const markup = renderToStaticMarkup(
      <SynchronizationDialog
        open
        operation="Saving DATA"
        reason="The server has not responded yet."
        onContinue={() => undefined}
        onIgnore={() => undefined}
      />,
    );
    expect(markup).toContain("Saving DATA");
    expect(markup).toContain("The server has not responded yet.");
    expect(markup).toContain("CONTINUE");
    expect(markup).toContain("IGNORE FOR 10 MIN");
  });
});
