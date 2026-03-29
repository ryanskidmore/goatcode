import { describe, it, expect, beforeEach } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { taskUpdateTool } from "./handler";
import { resetTaskStore, taskStore, generateTaskId } from "../storage";
import type { Task } from "../types";

const mockContext = {
  sessionID: "ses_test",
  messageID: "msg_test",
  agent: "test-agent",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
} satisfies Parameters<ToolDefinition["execute"]>[1];

function addTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now();
  const task: Task = {
    id: generateTaskId(),
    subject: "Default task",
    status: "pending",
    priority: "medium",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  taskStore.set(task.id, task);
  return task;
}

describe("taskUpdateTool", () => {
  beforeEach(() => {
    resetTaskStore();
  });

  describe("#given a task exists", () => {
    describe("#when updating its status", () => {
      it("#then returns the task with the new status", async () => {
        const task = addTask({ subject: "Update me" });
        const result = await taskUpdateTool.execute(
          { id: task.id, status: "completed" },
          mockContext,
        );
        expect(result).toContain("status: completed");
        expect(result).toContain("subject: Update me");
      });
    });

    describe("#when updating multiple fields", () => {
      it("#then all fields are updated", async () => {
        const task = addTask({ subject: "Original" });
        const result = await taskUpdateTool.execute(
          { id: task.id, subject: "Updated", priority: "high", content: "New content" },
          mockContext,
        );
        expect(result).toContain("subject: Updated");
        expect(result).toContain("priority: high");
        expect(result).toContain("content: New content");
      });
    });

    describe("#when updating a task", () => {
      it("#then the updatedAt timestamp advances", async () => {
        const earlyTime = Date.now() - 100000;
        const task = addTask({ subject: "Timestamp test", updatedAt: earlyTime });
        await taskUpdateTool.execute({ id: task.id, status: "in_progress" }, mockContext);
        const updatedTask = taskStore.get(task.id);
        expect(updatedTask!.updatedAt).toBeGreaterThan(earlyTime);
      });
    });
  });

  describe("#given a task does not exist", () => {
    describe("#when update is attempted", () => {
      it("#then returns an error message", async () => {
        const result = await taskUpdateTool.execute(
          { id: "task-unknown", status: "completed" },
          mockContext,
        );
        expect(result).toContain("Error: task not found");
      });
    });
  });
});
