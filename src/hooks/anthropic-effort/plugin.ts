import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createAnthropicEffortHandler } from "./handler";

const chatParamsHook = safeCreateHook("anthropic-effort", () =>
  createAnthropicEffortHandler("high"),
);

export const anthropicEffortPlugin = definePlugin({
  name: "anthropic-effort",
  version: "0.1.0",
  hooks: chatParamsHook
    ? {
        "chat.params": chatParamsHook,
      }
    : {},
});
