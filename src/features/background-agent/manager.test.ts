import { describe, expect, test, mock, afterAll, beforeEach } from "bun:test";
import type { OpenCodeContext } from "../../types/plugin";

let pollUntilStableSnapshot: { messageCount: number; isIdle: boolean; result?: string } = {
  messageCount: 2,
  isIdle: true,
  result: "delegated task finished",
};

mock.module("./spawner", () => ({
  spawnBackgroundSession: mock(async () => ({ sessionId: "ses_child_123" })),
}));

mock.module("./poller", () => ({
  pollUntilStable: mock(async () => pollUntilStableSnapshot),
}));

const { BackgroundAgentManager } = await import("./manager");

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  pollUntilStableSnapshot = {
    messageCount: 2,
    isIdle: true,
    result: "delegated task finished",
  };
});

describe("BackgroundAgentManager", () => {
  test("#when assistant role is top-level with text parts #then manager recovers result from final session fetch", async () => {
    //#given
    pollUntilStableSnapshot = {
      messageCount: 2,
      isIdle: true,
      result: undefined,
    };

    const ctx = {
      directory: "/tmp",
      client: {
        session: {
          delete: mock(async () => ({})),
          status: mock(async () => ({ data: {} })),
          messages: mock(async () => ({
            data: [
              {
                role: "assistant",
                parts: [{ type: "text", text: "assistant content from top-level role" }],
              },
            ],
          })),
        },
      },
    } as unknown as OpenCodeContext;

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_top_level_role_parts_recovery",
      prompt: "investigate and summarize",
      model: "gpt-5.4-mini",
      parentSessionID: "ses_parent_123",
      title: "Investigate summary (@deepworker subagent)",
    });

    for (let i = 0; i < 20; i += 1) {
      const latest = manager.get(task.id);
      if (latest?.status === "completed" || latest?.status === "failed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    //#then
    const latest = manager.get(task.id);
    expect(latest?.status).toBe("completed");
    expect(latest?.result).toBe("assistant content from top-level role");
    expect((ctx.client.session.delete as ReturnType<typeof mock>).mock.calls.length).toBe(0);

  });

  test("#when poller misses assistant text in API-shaped messages #then manager recovers result from final session fetch", async () => {
    //#given
    pollUntilStableSnapshot = {
      messageCount: 2,
      isIdle: true,
      result: undefined,
    };

    const ctx = {
      directory: "/tmp",
      client: {
        session: {
          delete: mock(async () => ({})),
          status: mock(async () => ({ data: {} })),
          messages: mock(async () => ({
            data: [
              {
                info: { role: "assistant", time: { created: Date.now() } },
                parts: [{ type: "text", text: "assistant content from parts" }],
              },
            ],
          })),
        },
      },
    } as unknown as OpenCodeContext;

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_api_parts_recovery",
      prompt: "investigate and summarize",
      model: "gpt-5.4-mini",
      parentSessionID: "ses_parent_123",
      title: "Investigate summary (@deepworker subagent)",
    });

    for (let i = 0; i < 20; i += 1) {
      const latest = manager.get(task.id);
      if (latest?.status === "completed" || latest?.status === "failed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    //#then
    const latest = manager.get(task.id);
    expect(latest?.status).toBe("completed");
    expect(latest?.result).toBe("assistant content from parts");
    expect(
      (ctx.client.session.messages as ReturnType<typeof mock>).mock.calls.length,
    ).toBeGreaterThan(0);
    expect((ctx.client.session.delete as ReturnType<typeof mock>).mock.calls.length).toBe(0);

  });
});
