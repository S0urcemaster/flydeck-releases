import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgentModule } from "./AgentModule";

describe("AgentModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(<AgentModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Agent module"');
    expect(markup).toContain("JOBS");
    expect(markup).toContain("MEMO");
    expect(markup).not.toContain('aria-label="Tree browser menu"');
  });
});
