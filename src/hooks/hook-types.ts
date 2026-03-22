import type { HookEventName } from "../types/hook"

export type HookTier = "message" | "tool" | "transform" | "event" | "config"

export const HOOK_TIERS: Record<HookEventName, HookTier> = {
  tool: "tool",
  "chat.message": "message",
  "chat.params": "message",
  "chat.headers": "message",
  "tool.execute.before": "tool",
  "tool.execute.after": "tool",
  "tool.definition": "tool",
  "experimental.chat.messages.transform": "transform",
  "experimental.chat.system.transform": "transform",
  event: "event",
  config: "config",
}
