import type { Task } from "./types"

/** In-memory task store shared across tool calls within a session. */
export const taskStore: Map<string, Task> = new Map()

/** Reset the store — used in tests to ensure isolation. */
export function resetTaskStore(): void {
  taskStore.clear()
}

/** Generate a unique task ID. */
export function generateTaskId(): string {
  return `task-${crypto.randomUUID()}`
}
