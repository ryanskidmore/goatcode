import { describe, expect, it } from "bun:test";
import { formatTask } from "./format-task";

describe("formatTask", () => {
  it("formats task with optional content", () => {
    const result = formatTask({
      id: "task-1",
      subject: "Ship release",
      status: "in_progress",
      priority: "high",
      content: "Coordinate rollout",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_500,
    });

    expect(result).toContain("id: task-1");
    expect(result).toContain("subject: Ship release");
    expect(result).toContain("status: in_progress");
    expect(result).toContain("priority: high");
    expect(result).toContain("content: Coordinate rollout");
    expect(result).toContain("createdAt: ");
    expect(result).toContain("updatedAt: ");
  });

  it("omits content line when content is absent", () => {
    const result = formatTask({
      id: "task-2",
      subject: "Run checks",
      status: "pending",
      priority: "medium",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });

    expect(result).not.toContain("content:");
  });
});
