import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createThinkingBlockValidatorHandler } from "./handler";

const messagesTransformHook = safeCreateHook(
  "thinking-block-validator",
  createThinkingBlockValidatorHandler,
);

export const thinkingBlockValidatorPlugin = definePlugin({
  name: "thinking-block-validator",
  version: "0.1.0",
  hooks: messagesTransformHook
    ? {
        "experimental.chat.messages.transform": messagesTransformHook,
      }
    : {},
});
