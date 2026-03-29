import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createContextWindowLimitHandler } from "./handler";

const eventHook = safeCreateHook("context-window-limit", createContextWindowLimitHandler);

export const contextWindowLimitPlugin = definePlugin({
  name: "context-window-limit",
  version: "0.1.0",
  hooks: eventHook
    ? {
        event: eventHook,
      }
    : {},
});
