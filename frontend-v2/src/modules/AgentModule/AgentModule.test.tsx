import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgentModule } from "./AgentModule";

describe("AgentModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(<AgentModule padding="SPACE_SM" />);

    expect(markup).toContain('aria-label="Agent module"');
    expect(markup).toContain("CHAT");
    expect(markup).toContain("MEMO");
    expect(markup).toContain('aria-label="Memory browser"');
    expect(markup).toContain("Identity");
    expect(markup).toContain("Operating rules");
    expect(markup).not.toContain("Gefäßpflanzen");
  });
});
