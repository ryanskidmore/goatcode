import { describe, it, expect } from "bun:test";
import type { OpenCodeContext } from "../../types/plugin";
import { handleSessionList } from "./list/handler";
import { handleSessionRead } from "./read/handler";
import { handleSessionSearch } from "./search/handler";
import { handleSessionInfo } from "./info/handler";

const SESSION_A_ID = "ses_aaa111";
const SESSION_B_ID = "ses_bbb222";

const NOW = 1735000000000;
const EARLIER = NOW - 86400000;

const mockMessages = {
  [SESSION_A_ID]: [
    {
      info: {
        id: "msg_001",
        sessionID: SESSION_A_ID,
        role: "user" as const,
        time: { created: EARLIER },
        agent: "orchestrator",
        model: { providerID: "anthropic", modelID: "claude-opus" },
      },
      parts: [
        {
          id: "part_001",
          sessionID: SESSION_A_ID,
          messageID: "msg_001",
          type: "text" as const,
          text: "Hello, can you help me implement the session manager tool?",
        },
      ],
    },
    {
      info: {
        id: "msg_002",
        sessionID: SESSION_A_ID,
        role: "assistant" as const,
        time: { created: NOW },
        parentID: "msg_001",
        modelID: "claude-opus",
        providerID: "anthropic",
        mode: "auto",
        path: { cwd: "/tmp", root: "/tmp" },
        cost: 0,
        tokens: { input: 100, output: 200, reasoning: 0, cache: { read: 0, write: 0 } },
      },
      parts: [
        {
          id: "part_002",
          sessionID: SESSION_A_ID,
          messageID: "msg_002",
          type: "text" as const,
          text: "Of course! Let me help you implement the session manager.",
        },
      ],
    },
  ],
  [SESSION_B_ID]: [
    {
      info: {
        id: "msg_003",
        sessionID: SESSION_B_ID,
        role: "user" as const,
        time: { created: NOW },
        agent: "worker",
        model: { providerID: "openai", modelID: "gpt-4" },
      },
      parts: [
        {
          id: "part_003",
          sessionID: SESSION_B_ID,
          messageID: "msg_003",
          type: "text" as const,
          text: "Search for the session manager implementation.",
        },
      ],
    },
  ],
};

const mockSessions = [
  {
    id: SESSION_A_ID,
    projectID: "proj_001",
    directory: "/tmp/test-project",
    title: "Session A",
    version: "1.0",
    time: { created: EARLIER, updated: NOW },
  },
  {
    id: SESSION_B_ID,
    projectID: "proj_001",
    directory: "/tmp/test-project",
    title: "Session B",
    version: "1.0",
    time: { created: NOW, updated: NOW },
  },
];

const mockTodos = [
  { id: "todo_001", content: "Implement session list", status: "completed", priority: "high" },
  { id: "todo_002", content: "Write tests", status: "in_progress", priority: "medium" },
];

function createMockCtx(overrides: Record<string, unknown> = {}): OpenCodeContext {
  return {
    directory: "/tmp/test-project",
    client: {
      session: {
        list: async () => ({ data: mockSessions }),
        messages: async (opts: { path: { id: string } }) => {
          const data = mockMessages[opts.path.id as keyof typeof mockMessages];
          if (!data) return { data: undefined, error: "session not found" };
          return { data };
        },
        todo: async () => ({ data: mockTodos }),
      },
    },
    ...overrides,
  } as unknown as OpenCodeContext;
}

describe("session_list", () => {
  describe("#given two sessions exist", () => {
    describe("#when called with no filters", () => {
      it("#then returns a formatted table with both sessions", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionList({}, ctx);

        expect(result).toContain("Session ID");
        expect(result).toContain("Messages");
        expect(result).toContain(SESSION_A_ID);
        expect(result).toContain(SESSION_B_ID);
      });
    });

    describe("#when called with limit=1", () => {
      it("#then returns only one session", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionList({ limit: 1 }, ctx);

        expect(result).toContain("Session ID");
        const lines = result
          .split("\n")
          .filter((l) => l.startsWith("|") && !l.startsWith("| Session"));
        expect(lines.length).toBe(2);
      });
    });
  });
});

describe("session_read", () => {
  describe("#given session A exists with 2 messages", () => {
    describe("#when called with session_id=SESSION_A_ID", () => {
      it("#then returns formatted messages with role and timestamp", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionRead({ session_id: SESSION_A_ID }, ctx);

        expect(result).toContain(SESSION_A_ID);
        expect(result).toContain("Messages: 2");
        expect(result).toContain("user");
        expect(result).toContain("assistant");
        expect(result).toContain("Hello, can you help me implement the session manager tool?");
      });
    });

    describe("#when called with include_todos=true", () => {
      it("#then includes the todo list in output", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionRead(
          { session_id: SESSION_A_ID, include_todos: true },
          ctx,
        );

        expect(result).toContain("=== Todos ===");
        expect(result).toContain("Implement session list");
        expect(result).toContain("Write tests");
      });
    });

    describe("#when called with a non-existent session_id", () => {
      it("#then returns a not found message", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionRead({ session_id: "ses_nonexistent" }, ctx);

        expect(result).toContain("Session not found");
      });
    });
  });
});

describe("session_search", () => {
  describe("#given two sessions with text content", () => {
    describe("#when searching for a term that exists in session A", () => {
      it("#then returns matching excerpts", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionSearch({ query: "session manager" }, ctx);

        expect(result).toContain("Found");
        expect(result).toContain(SESSION_A_ID);
      });
    });

    describe("#when searching within a specific session", () => {
      it("#then only searches that session", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionSearch(
          { query: "session manager", session_id: SESSION_A_ID },
          ctx,
        );

        expect(result).toContain(SESSION_A_ID);
        expect(result).not.toContain(SESSION_B_ID);
      });
    });

    describe("#when searching for a term that does not exist", () => {
      it("#then returns no matches found", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionSearch({ query: "xyzzy_nonexistent_term_12345" }, ctx);

        expect(result).toBe("No matches found.");
      });
    });
  });
});

describe("session_info", () => {
  describe("#given session A exists", () => {
    describe("#when called with session_id=SESSION_A_ID", () => {
      it("#then returns detailed session metadata", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionInfo({ session_id: SESSION_A_ID }, ctx);

        expect(result).toContain(`Session ID: ${SESSION_A_ID}`);
        expect(result).toContain("Messages: 2");
        expect(result).toContain("Agents Used:");
        expect(result).toContain("orchestrator");
        expect(result).toContain("Has Todos: Yes");
      });
    });

    describe("#when called with a non-existent session_id", () => {
      it("#then returns a not found message", async () => {
        const ctx = createMockCtx();
        const result = await handleSessionInfo({ session_id: "ses_nonexistent" }, ctx);

        expect(result).toContain("Session not found");
      });
    });
  });
});
