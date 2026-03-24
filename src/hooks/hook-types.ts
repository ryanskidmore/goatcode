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
  "permission.ask": "event",
  "command.execute.before": "event",
  "shell.env": "event",
  "experimental.chat.messages.transform": "transform",
  "experimental.chat.system.transform": "transform",
  "experimental.session.compacting": "transform",
  "experimental.text.complete": "transform",
  event: "event",
  config: "config",
}
