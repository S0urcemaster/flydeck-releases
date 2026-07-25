import { describe, expect, it } from "vitest";
import { formatChatSnapshot, type ChatSnapshot } from "./chat";

describe("formatChatSnapshot", () => {
  it("keeps a failed run and its error visible in the agent history", () => {
    const snapshot: ChatSnapshot = {
      id: "default",
      codexThreadId: null,
      messages: [{
        id: "message-1",
        role: "user",
        text: "Translate this",
        createdAt: "2026-07-25T09:22:05.522Z",
      }],
      activeRun: {
        id: "run-1",
        status: "failed",
        prompt: "Translate this",
        output: "",
        error: "AI service is currently overloaded. Please retry.",
        createdAt: "2026-07-25T09:22:05.522Z",
        updatedAt: "2026-07-25T09:22:16.298Z",
      },
    };

    expect(formatChatSnapshot(snapshot)).toContain(
      "Flydon\nRequest failed: AI service is currently overloaded. Please retry.",
    );
  });
});
