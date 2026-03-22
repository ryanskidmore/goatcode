import type { PluginHookHandler } from "../types/plugin"

export type PrioritizedHandler = {
  handler: PluginHookHandler
  priority: number
}

export function sortByPriority(handlers: PrioritizedHandler[]): PluginHookHandler[] {
  return [...handlers].sort((a, b) => a.priority - b.priority).map((h) => h.handler)
}

export function withPriority(handler: PluginHookHandler, priority: number): PrioritizedHandler {
  return { handler, priority }
}
