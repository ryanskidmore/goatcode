import { describe, it, expect, mock } from "bun:test";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleSessionInfo } from "./handler";

const SESSION_ID = "ses_info_test";
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
        text: "Hello",
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
        text: "Hi there",
      },
    ],
  },
];

const mockTodos = [
  { id: "todo_1", content: "Task one", status: "completed", priority: "high" },
  { id: "todo_2", content: "Task two", status: "pending", priority: "medium" },
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

describe("handleSessionInfo", () => {
  describe("#given a session with messages and todos", () => {
    describe("#when called with its session_id", () => {
      it("#then returns detailed session metadata", async () => {
        const ctx = createCtx();
        const result = await handleSessionInfo({ session_id: SESSION_ID }, ctx);
        expect(result).toContain(`Session ID: ${SESSION_ID}`);
        expect(result).toContain("Messages: 2");
        expect(result).toContain("Agents Used:");
        expect(result).toContain("orchestrator");
      });
    });

    describe("#when the session has todos", () => {
      it("#then shows the todo summary with counts", async () => {
        const ctx = createCtx();
        const result = await handleSessionInfo({ session_id: SESSION_ID }, ctx);
        expect(result).toContain("Has Todos: Yes");
        expect(result).toContain("2 items");
        expect(result).toContain("1 completed");
      });
    });
  });

  describe("#given a non-existent session", () => {
    describe("#when called with its id", () => {
      it("#then returns a not found message", async () => {
        const ctx = createCtx();
        const result = await handleSessionInfo({ session_id: "ses_does_not_exist" }, ctx);
        expect(result).toContain("Session not found");
      });
    });
  });
});

// ─── T121: session_info no longer emits "Has Transcript" ────────────────────

describe("T121 — session_info output no longer contains 'Has Transcript'", () => {
  it("formatted session detail does not contain 'Has Transcript'", async () => {
    const { buildSessionDetail, formatSessionDetail } = await import("../session-formatter");

    const detail = buildSessionDetail("ses_test", [], []);
    const output = formatSessionDetail(detail);

    expect(output).not.toContain("Has Transcript");
  });
});
