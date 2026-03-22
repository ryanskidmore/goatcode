import type { PluginHookHandler } from "../types/plugin"
import { wrapSafely } from "./safe-hook-wrapper"

export function composeHooks(
  eventName: string,
  handlers: PluginHookHandler[],
  options?: { safe?: boolean },
): PluginHookHandler {
  const wrapped = options?.safe !== false ? handlers.map((h) => wrapSafely(eventName, h)) : handlers

  return async (input: unknown, output: unknown) => {
    for (const handler of wrapped) {
      await handler(input, output)
    }
  }
}
