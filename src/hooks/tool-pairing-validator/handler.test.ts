import { describe, expect, it } from "bun:test";
import type { HookHandler } from "../../types/hook";
import { createToolPairingValidatorHandler } from "./handler";

const createHandler = (): HookHandler => createToolPairingValidatorHandler() as HookHandler;

describe("createToolPairingValidatorHandler", () => {
  it("preserves valid tool_use/tool_result pairs", async () => {
    const handler = createHandler();
    const messages = [
      {
        info: { role: "assistant", id: "a1" },
        parts: [
          { type: "text", text: "running" },
          { type: "tool_use", id: "toolu_1", name: "read", input: {} },
        ],
      },
      {
        info: { role: "user", id: "u1" },
        parts: [{ type: "tool_result", tool_use_id: "toolu_1", content: "ok" }],
      },
    ];

    await handler({}, { messages });

    expect(messages[0].parts).toHaveLength(2);
    expect(messages[1].parts).toHaveLength(1);
  });

  it("removes orphaned tool_use when next user message lacks matching result", async () => {
    const handler = createHandler();
    const messages = [
      {
        info: { role: "assistant", id: "a1" },
        parts: [
          { type: "text", text: "first" },
          { type: "tool_use", id: "toolu_orphan", name: "read", input: {} },
        ],
      },
      {
        info: { role: "user", id: "u1" },
        parts: [{ type: "text", text: "no result" }],
      },
    ];

    await handler({}, { messages });

    expect(messages[0].parts).toEqual([{ type: "text", text: "first" }]);
  });

  it("removes orphaned tool_result without preceding assistant tool_use", async () => {
    const handler = createHandler();
    const messages = [
      {
        info: { role: "assistant", id: "a1" },
        parts: [{ type: "text", text: "plain reply" }],
      },
      {
        info: { role: "user", id: "u1" },
        parts: [
          { type: "tool_result", tool_use_id: "toolu_missing", content: "oops" },
          { type: "text", text: "keep this" },
        ],
      },
    ];

    await handler({}, { messages });

    expect(messages[1].parts).toEqual([{ type: "text", text: "keep this" }]);
  });

  it("repairs mixed multi-block messages by keeping only matched ids", async () => {
    const handler = createHandler();
    const messages = [
      {
        info: { role: "assistant", id: "a1" },
        parts: [
          { type: "tool_use", id: "toolu_keep", name: "read", input: {} },
          { type: "tool_use", id: "toolu_drop", name: "grep", input: {} },
          { type: "text", text: "after tools" },
        ],
      },
      {
        info: { role: "user", id: "u1" },
        parts: [
          { type: "tool_result", tool_use_id: "toolu_keep", content: "ok" },
          { type: "tool_result", tool_use_id: "toolu_unrelated", content: "bad" },
          { type: "text", text: "normal user text" },
        ],
      },
    ];

    await handler({}, { messages });

    expect(messages[0].parts).toEqual([
      { type: "tool_use", id: "toolu_keep", name: "read", input: {} },
      { type: "text", text: "after tools" },
    ]);
    expect(messages[1].parts).toEqual([
      { type: "tool_result", tool_use_id: "toolu_keep", content: "ok" },
      { type: "text", text: "normal user text" },
    ]);
  });
});
