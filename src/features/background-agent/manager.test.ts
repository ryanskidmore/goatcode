import { describe, expect, test, mock, afterAll, beforeEach } from "bun:test";
import type { OpenCodeContext } from "../../types/plugin";
import { readConnectedProviders } from "../../shared/connected-providers-cache";
import type { BackgroundTask } from "./types";

const spawnBackgroundSessionMock = mock(async () => ({ sessionId: "ses_child_123" }));

mock.module("./spawner", () => ({
  spawnBackgroundSession: spawnBackgroundSessionMock,
}));

mock.module("../../shared/connected-providers-cache", () => ({
  readConnectedProviders: mock(() => null),
}));

const { BackgroundAgentManager } = await import("./manager");

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  spawnBackgroundSessionMock.mockClear();
  spawnBackgroundSessionMock.mockImplementation(async () => ({ sessionId: "ses_child_123" }));
  (readConnectedProviders as unknown as ReturnType<typeof mock>).mockClear();
  (readConnectedProviders as unknown as ReturnType<typeof mock>).mockImplementation(() => null);
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

function setSpawnerSequence(sessionIds: string[]) {
  spawnBackgroundSessionMock.mockImplementation(async () => {
    const next = sessionIds.shift();
    if (!next) {
      throw new Error("No more mocked session IDs");
    }
    return { sessionId: next };
  });
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
    expect(latest?.error).toContain("Rate limit exceeded");
  });

  test("#when quota exhaustion occurs #then retries with next-provider fallback model", async () => {
    //#given
    setSpawnerSequence(["ses_child_initial", "ses_child_retry"]);
    (readConnectedProviders as unknown as ReturnType<typeof mock>).mockImplementation(() => [
      "openai",
      "anthropic",
    ]);
    const manager = new BackgroundAgentManager();
    const ctx = createMockCtx({ messages: [] });

    const task = await manager.launch(ctx, {
      id: "task_quota_retry",
      prompt: "run deep validation",
      model: "openai/gpt-5.3-codex",
      fallbackChain: [
        { providers: ["openai"], model: "gpt-5.3-codex" },
        { providers: ["anthropic"], model: "claude-opus-4-6" },
      ],
    });

    await waitForSessionId(task);
    const originalSessionId = task.sessionId;

    //#when
    await manager.handleSessionError("ses_child_initial", "insufficient quota", {
      error: { statusCode: 429, message: "insufficient quota" },
      model: "openai/gpt-5.3-codex",
    });

    // Wait until the fallback-spawned session is visible on the task.
    await waitForSessionId(task, 50);

    //#then
    expect(task.status).toBe("running");
    expect(task.retryCount).toBe(1);
    expect(task.model).toBe("anthropic/claude-opus-4-6");
    expect(task.sessionId).not.toBe(originalSessionId);
    expect(task.attemptedModels).toContain("openai/gpt-5.3-codex");
    expect(task.attemptedModels).toContain("anthropic/claude-opus-4-6");
    expect(spawnBackgroundSessionMock).toHaveBeenCalledTimes(2);
  });

  test("#when fallback candidates are exhausted #then fails without infinite retries", async () => {
    //#given
    setSpawnerSequence(["ses_child_1", "ses_child_2", "ses_child_3", "ses_child_4", "ses_child_5"]);
    const manager = new BackgroundAgentManager();
    const ctx = createMockCtx({ messages: [] });

    const task = await manager.launch(ctx, {
      id: "task_retry_exhausted",
      prompt: "execute delegated work",
      model: "openai/gpt-5.3-codex",
      fallbackChain: [{ providers: ["openai"], model: "gpt-5.3-codex" }],
    });

    await waitForSessionId(task);

    //#when
    await manager.handleSessionError("ses_child_1", "quota exceeded", {
      error: { message: "quota exceeded" },
      model: "openai/gpt-5.3-codex",
    });

    //#then
    expect(task.status).toBe("failed");
    expect(task.error).toContain("no eligible fallback model available");
    expect(task.error).toContain("retries_attempted");
    expect(task.error).toContain("attempted_models");
    expect(task.error).toContain("fallback_chain");
    expect(task.retryCount).toBe(0);
    // Should not schedule a second launch when no alternative model exists.
    expect(spawnBackgroundSessionMock).toHaveBeenCalledTimes(1);
  });

  test("#when connected-provider cache excludes all fallbacks #then manager still attempts disconnected fallback models", async () => {
    //#given
    setSpawnerSequence(["ses_child_primary", "ses_child_fallback"]);
    (readConnectedProviders as unknown as ReturnType<typeof mock>).mockImplementation(() => [
      "openai",
    ]);
    const manager = new BackgroundAgentManager();
    const ctx = createMockCtx({ messages: [] });

    const task = await manager.launch(ctx, {
      id: "task_disconnected_fallback_attempt",
      prompt: "run delegated analysis",
      model: "openai/gpt-5.3-codex",
      fallbackChain: [
        { providers: ["openai"], model: "gpt-5.3-codex" },
        { providers: ["anthropic"], model: "claude-opus-4-6" },
      ],
    });

    await waitForSessionId(task);

    //#when
    await manager.handleSessionError("ses_child_primary", "subscription quota exceeded", {
      error: { statusCode: 429, message: "subscription quota exceeded" },
      model: "openai/gpt-5.3-codex",
    });

    await waitForSessionId(task, 50);

    //#then
    expect(task.status).toBe("running");
    expect(task.model).toBe("anthropic/claude-opus-4-6");
    expect(task.retryCount).toBe(1);
    expect(task.attemptedModels).toContain("openai/gpt-5.3-codex");
    expect(task.attemptedModels).toContain("anthropic/claude-opus-4-6");
    expect(spawnBackgroundSessionMock).toHaveBeenCalledTimes(2);
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
