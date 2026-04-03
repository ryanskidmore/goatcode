import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createUltraworkModeHandler } from "./handler";

const chatParamsHook = safeCreateHook("ultrawork-mode", createUltraworkModeHandler);

export const ultraworkModePlugin = definePlugin({
  name: "ultrawork-mode",
  version: "0.1.0",
  hooks: chatParamsHook
    ? {
        "chat.params": chatParamsHook,
      }
    : {},
});
