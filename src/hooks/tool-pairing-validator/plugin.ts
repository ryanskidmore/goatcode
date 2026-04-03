import { definePlugin } from "../../plugin-api";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createToolPairingValidatorHandler } from "./handler";

const toolPairingMessagesTransformHook = safeCreateHook(
  "tool-pairing-validator",
  createToolPairingValidatorHandler,
);

export const toolPairingValidatorPlugin = definePlugin({
  name: "tool-pairing-validator",
  version: "0.1.0",
  hooks: toolPairingMessagesTransformHook
    ? {
        "experimental.chat.messages.transform": toolPairingMessagesTransformHook,
      }
    : {},
});
