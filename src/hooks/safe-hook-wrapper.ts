import type { PluginHookHandler } from "../types/plugin"
import { log } from "../shared/logger"

export function wrapSafely(name: string, handler: PluginHookHandler): PluginHookHandler {
  return async (input: unknown, output: unknown) => {
    try {
      await handler(input, output)
    } catch (error) {
      log(`[hook] Error in hook "${name}"`, { error })
    }
  }
}
