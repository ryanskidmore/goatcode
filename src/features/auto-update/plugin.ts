import type { PluginDefinition } from "../../types/plugin"
import { definePlugin } from "../../plugin-api/define-plugin"
import { log } from "../../shared/logger"
import { checkForUpdate } from "./update-checker"

export function createAutoUpdatePlugin(): PluginDefinition {
  let hasChecked = false

  return definePlugin({
    name: "auto-update",
    version: "1.0.0",
    hooks: {
      event: async (input: unknown) => {
        const event = input as { type: string; properties?: unknown } | undefined
        if (!event || event.type !== "session.created") return
        if (hasChecked) return

        hasChecked = true

        try {
          const currentVersion = "0.1.0"
          const result = await checkForUpdate(currentVersion)

          if (result.updateAvailable) {
            log("[auto-update] Update available", {
              current: result.current,
              latest: result.latest,
            })
          }
        } catch (error) {
          log("[auto-update] Hook execution failed", { error })
        }
      },
    },
  })
}
