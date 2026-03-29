import type { Task } from "./types";

export function formatTask(task: Task): string {
  const lines = [
    `id: ${task.id}`,
    `subject: ${task.subject}`,
    `status: ${task.status}`,
    `priority: ${task.priority}`,
  ];

  if (task.content !== undefined) {
    lines.push(`content: ${task.content}`);
  }

  lines.push(`createdAt: ${new Date(task.createdAt).toISOString()}`);
  lines.push(`updatedAt: ${new Date(task.updatedAt).toISOString()}`);

  return lines.join("\n");
}
