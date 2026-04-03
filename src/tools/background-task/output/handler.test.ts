import { describe, it, expect, mock } from "bun:test";
import type { BackgroundTask, BackgroundAgentManager } from "../../../runtime";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleBackgroundOutput } from "./handler";

function makeTask(overrides: Partial<BackgroundTask> = {}): BackgroundTask {
  return {
    id: "task-42",
    status: "running",
    prompt: "do work",
    model: "claude-3",
    createdAt: Date.now() - 10000,
    startedAt: Date.now() - 9000,
    ...overrides,
  };
}

function makeManager(task: BackgroundTask | undefined): BackgroundAgentManager {
  return {
    get: mock((_id: string) => task),
    getAll: mock(() => (task ? [task] : [])),
    cancel: mock(async () => {}),
    launch: mock(async () => task!),
    complete: mock(() => {}),
    fail: mock(() => {}),
  } as unknown as BackgroundAgentManager;
}

function makeClient(
  messages: Array<{ id?: string; role?: string; content?: string }> = [],
): OpenCodeContext["client"] {
  // Transform flat test messages to the real API shape: { info: Message; parts: Part[] }
  const apiMessages = messages.map((m) => ({
    info: { id: m.id, role: m.role, time: { created: Date.now() } },
    parts: [{ type: "text", text: m.content ?? "" }],
  }));
  return {
    session: {
      messages: mock(async () => ({ data: apiMessages })),
      status: mock(async () => ({ data: {} })),
    },
  } as unknown as OpenCodeContext["client"];
}

describe("handleBackgroundOutput", () => {
  describe("#given a nonexistent task", () => {
    describe("#when called with unknown task_id", () => {
      it("#then returns task not found message", async () => {
        const manager = makeManager(undefined);

        const result = await handleBackgroundOutput(manager, { task_id: "no-such-task" });

        expect(result).toContain("Task not found: no-such-task");
      });
    });
  });

  describe("#given a queued task", () => {
    describe("#when called without block", () => {
      it("#then returns queued status info", async () => {
        const task = makeTask({ status: "queued", startedAt: undefined });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("queued");
        expect(result).toContain("task-42");
      });
    });
  });

  describe("#given a completed task", () => {
    describe("#when called", () => {
      it("#then returns the completed result", async () => {
        const task = makeTask({ status: "completed", result: "final answer: 42" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("completed");
        expect(result).toContain("final answer: 42");
      });

      it("#then falls back to final assistant session message when task result is empty", async () => {
        const task = makeTask({ status: "completed", result: "", sessionId: "ses_test123" });
        const manager = makeManager(task);
        const client = makeClient([
          { id: "msg1", role: "user", content: "do work" },
          { id: "msg2", role: "assistant", content: "useful final answer" },
        ]);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" }, client);

        expect(result).toContain("completed");
        expect(result).toContain("useful final answer");
        expect(result).not.toContain("(no output)");
      });

      it("#then keeps no-output fallback when task result is empty and no client is provided", async () => {
        const task = makeTask({ status: "completed", result: "", sessionId: "ses_test123" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("completed");
        expect(result).toContain("(no output)");
      });
    });
  });

  describe("#given a failed task", () => {
    describe("#when called", () => {
      it("#then returns the error details", async () => {
        const task = makeTask({ status: "failed", error: "rate limit exceeded" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("failed");
        expect(result).toContain("rate limit exceeded");
      });
    });
  });

  describe("#given a cancelled task", () => {
    describe("#when called", () => {
      it("#then returns cancelled message", async () => {
        const task = makeTask({ status: "cancelled" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("cancelled");
      });
    });
  });

  describe("#given a running task with no startedAt", () => {
    describe("#when called without block", () => {
      it("#then returns running status with unknown elapsed", async () => {
        const task = makeTask({ status: "running", startedAt: undefined });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("running");
        expect(result).toContain("unknown");
      });
    });
  });

  describe("#given timeout capping", () => {
    describe("#when timeout exceeds 55000ms", () => {
      it("#then caps at 55000ms and still returns a result", async () => {
        let callCount = 0;
        const task = makeTask({ status: "running" });

        const manager = {
          get: mock((_id: string) => {
            callCount++;
            if (callCount >= 2) {
              return makeTask({ status: "completed", result: "done" });
            }
            return task;
          }),
          getAll: mock(() => [task]),
          cancel: mock(async () => {}),
          launch: mock(async () => task),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundOutput(manager, {
          task_id: "task-42",
          block: true,
          timeout: 999_999_999,
        });

        expect(result).toContain("completed");
        expect(result).toContain("done");
      });
    });
  });

  describe("#given full_session mode with client", () => {
    describe("#when task has sessionId and full_session is true", () => {
      it("#then returns session messages", async () => {
        const task = makeTask({
          status: "completed",
          sessionId: "ses_test123",
          result: "final answer",
        });
        const manager = makeManager(task);
        const client = makeClient([
          { id: "msg1", role: "user", content: "do work" },
          { id: "msg2", role: "assistant", content: "here is the result" },
        ]);

        const result = await handleBackgroundOutput(
          manager,
          { task_id: "task-42", full_session: true },
          client,
        );

        expect(result).toContain("ses_test123");
        expect(result).toContain("here is the result");
      });
    });

    describe("#when full_session is true but no client provided", () => {
      it("#then falls back to basic output", async () => {
        const task = makeTask({
          status: "completed",
          sessionId: "ses_test123",
          result: "final answer",
        });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, {
          task_id: "task-42",
          full_session: true,
        });

        expect(result).toContain("completed");
        expect(result).toContain("final answer");
      });
    });
  });
});
