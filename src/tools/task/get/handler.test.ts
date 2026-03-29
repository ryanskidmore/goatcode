import { describe, it, expect, beforeEach } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { taskGetTool } from "./handler";
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

describe("taskGetTool", () => {
  beforeEach(() => {
    resetTaskStore();
  });

  describe("#given a task exists in the store", () => {
    describe("#when called with its id", () => {
      it("#then returns the full task details", async () => {
        const task = addTask({
          subject: "My task",
          content: "Details here",
          priority: "high",
        });
        const result = await taskGetTool.execute({ id: task.id }, mockContext);
        expect(result).toContain(`id: ${task.id}`);
        expect(result).toContain("subject: My task");
        expect(result).toContain("content: Details here");
        expect(result).toContain("priority: high");
        expect(result).toContain("createdAt:");
        expect(result).toContain("updatedAt:");
      });
    });
  });

  describe("#given a task does not exist", () => {
    describe("#when called with a non-existent id", () => {
      it("#then returns an error message", async () => {
        const result = await taskGetTool.execute(
          { id: "task-does-not-exist" },
          mockContext,
        );
        expect(result).toContain("Error: task not found");
      });
    });
  });

  describe("#given a task with optional content omitted", () => {
    describe("#when retrieved", () => {
      it("#then the output does not include a content line", async () => {
        const task = addTask({ subject: "No content task" });
        const result = await taskGetTool.execute({ id: task.id }, mockContext);
        expect(result).toContain("subject: No content task");
        expect(result).not.toContain("content:");
      });
    });
  });
});
