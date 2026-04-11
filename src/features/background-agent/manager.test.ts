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

async function waitForSessionId(task: BackgroundTask, maxAttempts = 20): Promise<string> {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (task.sessionId) return task.sessionId;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for sessionId on task ${task.id}`);
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

    // Simulate session.idle event — no need to backdate since time guard
    // only applies to empty transcripts and this one has content.
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
    await manager.handleSessionIdle("ses_child_123");

    //#then
    const latest = manager.get(task.id);
    expect(latest?.status).toBe("completed");
    expect(latest?.result).toBe("assistant content from parts");
    expect(
      (ctx.client.session.messages as ReturnType<typeof mock>).mock.calls.length,
    ).toBeGreaterThan(0);
  });

  test("#when session.idle fires with empty transcript within MIN_IDLE_TIME_MS #then task remains running", async () => {
    //#given — empty messages, so the time guard applies
    const ctx = createMockCtx({ messages: [] });

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

    //#then — should still be running (early empty idle ignored)
    expect(task.status).toBe("running");
  });

  test("#when session.idle fires early but transcript has assistant content #then task completes immediately", async () => {
    //#given — assistant content present, so time guard does NOT apply
    const ctx = createMockCtx({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "fast result" }],
        },
      ],
    });

    const manager = new BackgroundAgentManager();

    //#when
    const task = await manager.launch(ctx, {
      id: "task_fast_completion",
      prompt: "investigate",
      model: "gpt-5.4-mini",
    });

    await waitForSessionId(task);

    // Do NOT override sessionStartedAt — the task just started but has content
    await manager.handleSessionIdle("ses_child_123");

    //#then — should complete even though it's early, because there's content
    expect(task.status).toBe("completed");
    expect(task.result).toBe("fast result");
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

    // Simulate session.idle — no need to backdate, transcript has content
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

  test("#when tasks share model but differ in depth #then both run concurrently under limit=1", async () => {
    //#given — concurrency limit of 1: a flat pool would queue the second task
    const ctx = createMockCtx({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "result" }],
        },
      ],
    });
    const manager = new BackgroundAgentManager(1);

    //#when — launch two tasks on the same model at DIFFERENT depths
    const depth1Task = await manager.launch(ctx, {
      id: "task_depth1",
      prompt: "depth-1 work",
      model: "gpt-5.4-mini",
      delegationDepth: 1,
    });

    // Wait for first task to acquire its slot and start running
    await waitForSessionId(depth1Task);
    expect(depth1Task.status).toBe("running");

    const depth2Task = await manager.launch(ctx, {
      id: "task_depth2",
      prompt: "depth-2 work",
      model: "gpt-5.4-mini",
      delegationDepth: 2,
    });

    // Wait for second task — if pools are depth-keyed, it gets its own slot
    await waitForSessionId(depth2Task);

    //#then — both tasks are running concurrently (not queued)
    // With a flat pool (limit=1, same model), the second would be stuck in "queued".
    // Depth-keyed pools give each depth its own limit=1 slot.
    expect(depth1Task.status).toBe("running");
    expect(depth2Task.status).toBe("running");
    expect(depth1Task.delegationDepth).toBe(1);
    expect(depth2Task.delegationDepth).toBe(2);
  });

  test("#when getQueuePosition is called for a queued task #then returns positive queue length", async () => {
    //#given — limit=1 on the SAME depth, so the second task must queue
    const manager = new BackgroundAgentManager(1);
    const ctx = createMockCtx({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "result" }],
        },
      ],
    });

    //#when — first task takes the only slot at depth-0
    const holder = await manager.launch(ctx, {
      id: "task_slot_holder",
      prompt: "hold slot",
      model: "test-model",
      delegationDepth: 0,
    });

    // Wait for it to be running (holding the slot)
    await waitForSessionId(holder);
    expect(holder.status).toBe("running");

    // Second task at same depth must queue behind the first
    const queued = await manager.launch(ctx, {
      id: "task_queued",
      prompt: "waiting",
      model: "test-model",
      delegationDepth: 0,
    });

    //#then — verify the task is actually queued and has a positive queue position
    expect(queued.status).toBe("queued");
    const pos = manager.getQueuePosition("task_queued");
    expect(pos).toBeGreaterThan(0);
  });
});
