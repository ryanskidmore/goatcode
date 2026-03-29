import { definePlugin } from "../../plugin-api";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createForegroundFallbackHandler } from "./handler";

const foregroundFallbackEventHook = safeCreateHook(
  "foreground-fallback",
  createForegroundFallbackHandler,
);

export const foregroundFallbackPlugin = definePlugin({
  name: "foreground-fallback",
  version: "0.1.0",
  hooks: foregroundFallbackEventHook
    ? {
        event: foregroundFallbackEventHook,
      }
    : {},
});
