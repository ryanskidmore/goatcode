import { describe, expect, test, mock, afterAll } from "bun:test";
import type { OpenCodeContext } from "../../types/plugin";
import type { BackgroundTask } from "./types";

mock.module("./spawner", () => ({
  spawnBackgroundSession: mock(async () => ({ sessionId: "ses_child_123" })),
}));

const { BackgroundAgentManager } = await import("./manager");

afterAll(() => {
  mock.restore();
});

function createMockCtx(opts?: { messages?: unknown[] }): OpenCodeContext {
  return {
    directory: "/tmp",
    client: {
      session: {
        delete: mock(async () => ({})),
        status: mock(async () => ({ data: {} })),
        messages: mock(async () => ({
          data: opts?.messages ?? [],
        })),
      },
    },
  } as unknown as OpenCodeContext;
}

async function waitForSessionId(task: BackgroundTask, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (task.sessionId) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("BackgroundAgentManager", () => {
  test("#when session.idle fires with assistant content #then task completes via event", async () => {
    //#given
    const ctx = createMockCtx({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "assistant content from top-level role" }],
        },
      ],
    });

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_event_driven_completion",
      prompt: "investigate and summarize",
      model: "gpt-5.4-mini",
      parentSessionID: "ses_parent_123",
      title: "Investigate summary (@deepworker subagent)",
    });

    await waitForSessionId(task);
    expect(task.sessionId).toBe("ses_child_123");
    expect(task.status).toBe("running");

    // Simulate session.idle event (with enough elapsed time)
    // Override sessionStartedAt to bypass MIN_IDLE_TIME_MS guard
    task.sessionStartedAt = Date.now() - 10_000;
    await manager.handleSessionIdle("ses_child_123");

    //#then
    const latest = manager.get(task.id);
    expect(latest?.status).toBe("completed");
    expect(latest?.result).toBe("assistant content from top-level role");
  });

  test("#when session.idle fires with API-shaped messages #then manager extracts result from parts", async () => {
    //#given
    const ctx = createMockCtx({
      messages: [
        {
          info: { role: "assistant", time: { created: Date.now() } },
          parts: [{ type: "text", text: "assistant content from parts" }],
        },
      ],
    });

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_api_parts_extraction",
      prompt: "investigate and summarize",
      model: "gpt-5.4-mini",
      parentSessionID: "ses_parent_123",
      title: "Investigate summary (@deepworker subagent)",
    });

    await waitForSessionId(task);

    // Simulate session.idle event
    task.sessionStartedAt = Date.now() - 10_000;
    await manager.handleSessionIdle("ses_child_123");

    //#then
    const latest = manager.get(task.id);
    expect(latest?.status).toBe("completed");
    expect(latest?.result).toBe("assistant content from parts");
    expect(
      (ctx.client.session.messages as ReturnType<typeof mock>).mock.calls.length,
    ).toBeGreaterThan(0);
  });

  test("#when session.idle fires too early #then task remains running", async () => {
    //#given
    const ctx = createMockCtx({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "some content" }],
        },
      ],
    });

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_early_idle",
      prompt: "investigate",
      model: "gpt-5.4-mini",
    });

    await waitForSessionId(task);

    // Do NOT override sessionStartedAt — idle fires within MIN_IDLE_TIME_MS
    await manager.handleSessionIdle("ses_child_123");

    //#then — should still be running (early idle ignored)
    expect(task.status).toBe("running");
  });

  test("#when waitForCompletion is used #then it resolves when task completes", async () => {
    //#given
    const ctx = createMockCtx({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "waited result" }],
        },
      ],
    });

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_wait_completion",
      prompt: "investigate",
      model: "gpt-5.4-mini",
    });

    await waitForSessionId(task);

    // Start waiting (will resolve when event fires)
    const waitPromise = manager.waitForCompletion("task_wait_completion", 5_000);

    // Simulate session.idle after enough time
    task.sessionStartedAt = Date.now() - 10_000;
    await manager.handleSessionIdle("ses_child_123");

    //#then
    const resolved = await waitPromise;
    expect(resolved?.status).toBe("completed");
    expect(resolved?.result).toBe("waited result");
  });

  test("#when waitForCompletion times out #then it returns current task state", async () => {
    //#given
    const ctx = createMockCtx();
    const manager = new BackgroundAgentManager();

    const task = await manager.launch(ctx, {
      id: "task_wait_timeout",
      prompt: "investigate",
      model: "gpt-5.4-mini",
    });

    await waitForSessionId(task);

    //#when — very short timeout, no idle event
    const resolved = await manager.waitForCompletion("task_wait_timeout", 50);

    //#then
    expect(resolved?.status).toBe("running");
  });

  test("#when session.error fires #then task fails with error message", async () => {
    //#given
    const ctx = createMockCtx({ messages: [] });
    const manager = new BackgroundAgentManager();

    const task = await manager.launch(ctx, {
      id: "task_session_error",
      prompt: "investigate",
      model: "gpt-5.4-mini",
    });

    await waitForSessionId(task);

    //#when
    await manager.handleSessionError("ses_child_123", "Rate limit exceeded");

    //#then
    const latest = manager.get(task.id);
    expect(latest?.status).toBe("failed");
    expect(latest?.error).toBe("Rate limit exceeded");
  });

  test("#when handleSessionIdle receives unknown session #then it is ignored", async () => {
    //#given
    const manager = new BackgroundAgentManager();

    //#when — no tasks launched, unknown session
    await manager.handleSessionIdle("ses_unknown_123");

    //#then — no crash, no state change
    expect(manager.getAll()).toHaveLength(0);
  });
});
