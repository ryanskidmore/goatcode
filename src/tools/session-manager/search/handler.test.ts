import { describe, it, expect, mock } from "bun:test";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleSessionSearch } from "./handler";

const SESSION_A = "ses_search_a";
const SESSION_B = "ses_search_b";
const NOW = 1735000000000;

const mockMessagesA = [
  {
    info: {
      id: "msg_1",
      sessionID: SESSION_A,
      role: "user" as const,
      time: { created: NOW },
      agent: "orchestrator",
    },
    parts: [
      {
        id: "p_1",
        sessionID: SESSION_A,
        messageID: "msg_1",
        type: "text" as const,
        text: "Implement the session manager tool",
      },
    ],
  },
];

const mockMessagesB = [
  {
    info: {
      id: "msg_2",
      sessionID: SESSION_B,
      role: "user" as const,
      time: { created: NOW },
      agent: "worker",
    },
    parts: [
      {
        id: "p_2",
        sessionID: SESSION_B,
        messageID: "msg_2",
        type: "text" as const,
        text: "Deploy to production server",
      },
    ],
  },
];

const mockSessions = [
  { id: SESSION_A, time: { created: NOW, updated: NOW } },
  { id: SESSION_B, time: { created: NOW, updated: NOW } },
];

function createCtx(): OpenCodeContext {
  return {
    directory: "/tmp/test",
    client: {
      session: {
        list: mock(async () => ({ data: mockSessions })),
        messages: mock(async (opts: { path: { id: string } }) => {
          if (opts.path.id === SESSION_A) return { data: mockMessagesA };
          if (opts.path.id === SESSION_B) return { data: mockMessagesB };
          return { data: [] };
        }),
      },
    },
  } as unknown as OpenCodeContext;
}

describe("handleSessionSearch", () => {
  describe("#given sessions with text content", () => {
    describe("#when searching for a term that exists", () => {
      it("#then returns matching results with session ID", async () => {
        const ctx = createCtx();
        const result = await handleSessionSearch({ query: "session manager" }, ctx);
        expect(result).toContain("Found");
        expect(result).toContain(SESSION_A);
      });
    });

    describe("#when searching within a specific session", () => {
      it("#then only returns matches from that session", async () => {
        const ctx = createCtx();
        // "production server" exists only in SESSION_B — scoping to SESSION_A must yield no results,
        // proving the session_id filter is actually enforced (not just coincidentally correct).
        const result = await handleSessionSearch(
          { query: "production server", session_id: SESSION_A },
          ctx,
        );
        expect(result).toBe("No matches found.");
      });
    });

    describe("#when searching for a term that does not exist", () => {
      it("#then returns no matches found", async () => {
        const ctx = createCtx();
        const result = await handleSessionSearch({ query: "xyzzy_nonexistent" }, ctx);
        expect(result).toBe("No matches found.");
      });
    });

    describe("#when case_sensitive is true and case does not match", () => {
      it("#then returns no matches", async () => {
        const ctx = createCtx();
        const result = await handleSessionSearch(
          { query: "SESSION MANAGER", case_sensitive: true },
          ctx,
        );
        expect(result).toBe("No matches found.");
      });
    });
  });

  describe("#given 51 sessions with slow responses", () => {
    describe("#when the search exceeds the timeout", () => {
      it("#then returns the timeout message", async () => {
        const slowSessions = Array.from({ length: 51 }, (_, i) => ({
          id: `ses_slow_${i}`,
          time: { created: NOW, updated: NOW },
        }));

        const ctx = {
          directory: "/tmp/test",
          client: {
            session: {
              list: mock(async () => ({ data: slowSessions })),
              // Never-resolving promise simulates a hung session scan
              messages: mock(async () => new Promise(() => {})),
            },
          },
        } as unknown as OpenCodeContext;

        // Pass a small timeoutMs to avoid waiting 60s in tests
        const result = await handleSessionSearch({ query: "anything" }, ctx, 50);
        expect(result).toContain("Search timed out after 60s");
        expect(result).toContain("Try narrowing your query");
      });
    });
  });
});
