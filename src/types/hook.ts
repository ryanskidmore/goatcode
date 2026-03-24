import type { Plugin } from "@opencode-ai/plugin"

/** All OpenCode hook event names used by GoatCode. */
export type HookEventName =
  | "tool"
  | "config"
  | "chat.message"
  | "chat.params"
  | "chat.headers"
  | "event"
  | "tool.execute.before"
  | "tool.execute.after"
  | "experimental.chat.messages.transform"
  | "experimental.chat.system.transform"
  | "tool.definition"

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
