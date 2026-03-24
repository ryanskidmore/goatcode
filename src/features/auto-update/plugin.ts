import type { PluginDefinition } from "../../types/plugin"
import { definePlugin } from "../../plugin-api/define-plugin"
import { log } from "../../shared/logger"
import { checkForUpdate } from "./update-checker"
import packageJson from "../../../package.json"

function isSessionCreatedEvent(value: unknown): value is { type: string; properties?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  )
}

export function createAutoUpdatePlugin(): PluginDefinition {
  let hasChecked = false

  return definePlugin({
    name: "auto-update",
    version: "1.0.0",
    hooks: {
      event: async (input: unknown) => {
        if (!isSessionCreatedEvent(input) || input.type !== "session.created") return
        if (hasChecked) return

        hasChecked = true

        try {
          const currentVersion = packageJson.version
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
