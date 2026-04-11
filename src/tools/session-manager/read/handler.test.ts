import { describe, it, expect, mock } from "bun:test";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleSessionRead } from "./handler";

const SESSION_ID = "ses_read_test";
const NOW = 1735000000000;
const EARLIER = NOW - 86400000;

const mockMessages = [
  {
    info: {
      id: "msg_1",
      sessionID: SESSION_ID,
      role: "user" as const,
      time: { created: EARLIER },
      agent: "orchestrator",
    },
    parts: [
      {
        id: "p_1",
        sessionID: SESSION_ID,
        messageID: "msg_1",
        type: "text" as const,
        text: "First message",
      },
    ],
  },
  {
    info: {
      id: "msg_2",
      sessionID: SESSION_ID,
      role: "assistant" as const,
      time: { created: NOW },
    },
    parts: [
      {
        id: "p_2",
        sessionID: SESSION_ID,
        messageID: "msg_2",
        type: "text" as const,
        text: "Second message",
      },
    ],
  },
];

const mockTodos = [
  { id: "todo_1", content: "Fix bugs", status: "completed", priority: "high" },
  { id: "todo_2", content: "Write docs", status: "pending", priority: "low" },
];

function createCtx(): OpenCodeContext {
  return {
    directory: "/tmp/test",
    client: {
      session: {
        messages: mock(async (opts: { path: { id: string } }) => {
          if (opts.path.id === SESSION_ID) return { data: mockMessages };
          return { data: undefined, error: "not found" };
        }),
        todo: mock(async () => ({ data: mockTodos })),
      },
    },
  } as unknown as OpenCodeContext;
}

describe("handleSessionRead", () => {
  describe("#given a session with messages exists", () => {
    describe("#when called with a valid session_id", () => {
      it("#then returns formatted messages with roles", async () => {
        const ctx = createCtx();
        const result = await handleSessionRead({ session_id: SESSION_ID }, ctx);
        expect(result).toContain(SESSION_ID);
        expect(result).toContain("Messages: 2");
        expect(result).toContain("user");
        expect(result).toContain("assistant");
        expect(result).toContain("First message");
      });
    });

    describe("#when called with include_todos=true", () => {
      it("#then includes the todo list in output", async () => {
        const ctx = createCtx();
        const result = await handleSessionRead(
          { session_id: SESSION_ID, include_todos: true },
          ctx,
        );
        expect(result).toContain("=== Todos ===");
        expect(result).toContain("Fix bugs");
        expect(result).toContain("Write docs");
      });
    });

    describe("#when called with limit=1", () => {
      it("#then returns only the first message", async () => {
        const ctx = createCtx();
        const result = await handleSessionRead({ session_id: SESSION_ID, limit: 1 }, ctx);
        expect(result).toContain("Messages: 1");
        expect(result).toContain("First message");
        expect(result).not.toContain("Second message");
      });
    });
  });

  describe("#given a non-existent session", () => {
    describe("#when called with its id", () => {
      it("#then returns a not found message", async () => {
        const ctx = createCtx();
        const result = await handleSessionRead({ session_id: "ses_nonexistent" }, ctx);
        expect(result).toContain("Session not found");
      });
    });
  });
});

// ─── T112: include_transcript removed from session_read schema ───────────────

describe("T112 — include_transcript parameter removed from session_read", () => {
  it("include_transcript is no longer in SessionReadArgs type", async () => {
    await import("./types");
    const pluginModule = await import("./plugin");
    const plugin = pluginModule.sessionReadPlugin;
    const toolDef = plugin.tools?.session_read;

    expect(toolDef).toBeDefined();
    const argsKeys = Object.keys((toolDef as { args?: Record<string, unknown> })?.args ?? {});
    expect(argsKeys).not.toContain("include_transcript");
  });
});
