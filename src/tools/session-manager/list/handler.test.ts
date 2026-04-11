import { describe, it, expect, mock } from "bun:test";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleSessionList } from "./handler";

const NOW = 1735000000000;
const EARLIER = NOW - 86400000;

const mockSessions = [
  {
    id: "ses_aaa",
    projectID: "proj_1",
    directory: "/tmp/test",
    title: "Session A",
    version: "1.0",
    time: { created: EARLIER, updated: EARLIER },
  },
  {
    id: "ses_bbb",
    projectID: "proj_1",
    directory: "/tmp/test",
    title: "Session B",
    version: "1.0",
    time: { created: NOW, updated: NOW },
  },
];

const mockMessages: Record<
  string,
  Array<{ info: Record<string, unknown>; parts: Array<Record<string, unknown>> }>
> = {
  ses_aaa: [
    {
      info: {
        id: "msg_1",
        sessionID: "ses_aaa",
        role: "user",
        time: { created: EARLIER },
        agent: "orchestrator",
      },
      parts: [{ id: "p_1", sessionID: "ses_aaa", messageID: "msg_1", type: "text", text: "Hello" }],
    },
  ],
  ses_bbb: [
    {
      info: {
        id: "msg_2",
        sessionID: "ses_bbb",
        role: "user",
        time: { created: NOW },
        agent: "worker",
      },
      parts: [{ id: "p_2", sessionID: "ses_bbb", messageID: "msg_2", type: "text", text: "World" }],
    },
  ],
};

function createCtx(overrides: Record<string, unknown> = {}): OpenCodeContext {
  return {
    directory: "/tmp/test",
    client: {
      session: {
        list: mock(async () => ({ data: mockSessions })),
        messages: mock(async (opts: { path: { id: string } }) => ({
          data: mockMessages[opts.path.id] ?? [],
        })),
      },
    },
    ...overrides,
  } as unknown as OpenCodeContext;
}

describe("handleSessionList", () => {
  describe("#given sessions exist", () => {
    describe("#when called with no filters", () => {
      it("#then returns a formatted table with all sessions", async () => {
        const ctx = createCtx();
        const result = await handleSessionList({}, ctx);
        expect(result).toContain("Session ID");
        expect(result).toContain("ses_aaa");
        expect(result).toContain("ses_bbb");
      });
    });

    describe("#when called with from_date set to NOW", () => {
      it("#then only returns sessions updated at or after NOW", async () => {
        const ctx = createCtx();
        const result = await handleSessionList({ from_date: new Date(NOW).toISOString() }, ctx);
        expect(result).toContain("ses_bbb");
        expect(result).not.toContain("ses_aaa");
      });
    });

    describe("#when called with limit=1", () => {
      it("#then returns only one session row (the newest)", async () => {
        const ctx = createCtx();
        const result = await handleSessionList({ limit: 1 }, ctx);
        const dataLines = result.split("\n").filter((l) => l.startsWith("| ses_"));
        expect(dataLines.length).toBe(1);
        expect(result).toContain("ses_bbb");
        expect(result).not.toContain("ses_aaa");
      });
    });
  });

  describe("#given no sessions exist", () => {
    describe("#when called", () => {
      it("#then returns no sessions found message", async () => {
        const ctx = {
          directory: "/tmp/test",
          client: {
            session: {
              list: mock(async () => ({ data: [] })),
              messages: mock(async () => ({ data: [] })),
            },
          },
        } as unknown as OpenCodeContext;
        const result = await handleSessionList({}, ctx);
        expect(result).toBe("No sessions found.");
      });
    });
  });
});

// ─── T106: session_list with invalid date returns all sessions ───────────────

describe("T106 — session_list with invalid from_date keeps all sessions", () => {
  it("returns all sessions when from_date is 'not-a-date' (NaN guard)", async () => {
    const { handleSessionList } = await import("./handler");
    const { createMockPluginContext } = await import("../../../test-utils");

    const sessions = [
      { id: "ses_1", parentID: null, time: { updated: Date.now() } },
      { id: "ses_2", parentID: null, time: { updated: Date.now() - 1000 } },
    ];

    const ctx = {
      ...createMockPluginContext(),
      client: {
        session: {
          list: mock(async () => ({ data: sessions })),
          messages: mock(async () => ({ data: [] })),
        },
      },
    } as never;

    const result = await handleSessionList(
      { from_date: "not-a-date", session_id: undefined } as never,
      ctx,
    );

    expect(result).toContain("ses_1");
    expect(result).toContain("ses_2");
  });
});
