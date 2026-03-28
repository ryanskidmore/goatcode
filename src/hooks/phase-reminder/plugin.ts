import { definePlugin } from "../../plugin-api"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createPhaseReminderHandler } from "./handler"

const phaseReminderMessagesTransformHook = safeCreateHook("phase-reminder", createPhaseReminderHandler)

export const phaseReminderPlugin = definePlugin({
  name: "phase-reminder",
  version: "0.1.0",
  hooks: phaseReminderMessagesTransformHook
    ? {
        "experimental.chat.messages.transform": phaseReminderMessagesTransformHook,
      }
    : {},
})
