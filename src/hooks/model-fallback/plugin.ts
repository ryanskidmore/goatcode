import { definePlugin } from "../../plugin-api";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createModelFallbackHandler } from "./handler";

const modelFallbackEventHook = safeCreateHook("model-fallback", () => createModelFallbackHandler());

export const modelFallbackPlugin = definePlugin({
  name: "model-fallback",
  version: "0.1.0",
  hooks: modelFallbackEventHook ? { event: modelFallbackEventHook } : undefined,
});
