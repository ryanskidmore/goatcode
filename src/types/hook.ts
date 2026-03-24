import type { Plugin } from "@opencode-ai/plugin"

/** All OpenCode hook event names — single source of truth. */
export const HOOK_EVENT_NAMES = [
  "tool",
  "config",
  "chat.message",
  "chat.params",
  "chat.headers",
  "event",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.chat.messages.transform",
  "experimental.chat.system.transform",
  "tool.definition",
  "permission.ask",
  "command.execute.before",
  "shell.env",
  "experimental.session.compacting",
  "experimental.text.complete",
] as const

/** All OpenCode hook event names. */
export type HookEventName = (typeof HOOK_EVENT_NAMES)[number]

/** Generic hook handler signature fallback. */
export type HookHandler = (input: unknown, output: unknown) => Promise<void> | void

/** Raw plugin instance shape returned to OpenCode. */
type OpenCodePluginInstance = Awaited<ReturnType<Plugin>>

/** Resolves the concrete OpenCode hook handler type for a hook name. */
type HookHandlerFor<Name extends HookEventName> = NonNullable<OpenCodePluginInstance[Name]> extends (
  ...args: infer Args
) => infer Return
  ? (...args: Args) => Return
  : HookHandler

/** Hook contributions mapped by event name. */
export type PluginHookContributions = {
  [Name in HookEventName]: HookHandlerFor<Name>
}

/** Priority for hook execution ordering (lower values run first). */
export type HookPriority = number
