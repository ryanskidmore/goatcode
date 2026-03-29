import { describe, it, expect, mock } from "bun:test";
import type { BackgroundTask, BackgroundAgentManager } from "../../../runtime";
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
    describe("#when timeout exceeds 600000ms", () => {
      it("#then caps at 600000ms and still returns a result", async () => {
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
});
