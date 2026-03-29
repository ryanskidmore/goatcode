import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createSessionRecoveryHandler } from "./handler";

const eventHook = safeCreateHook("session-recovery", createSessionRecoveryHandler);

export const sessionRecoveryPlugin = definePlugin({
  name: "session-recovery",
  version: "0.1.0",
  hooks: eventHook
    ? {
        event: eventHook,
      }
    : {},
});
