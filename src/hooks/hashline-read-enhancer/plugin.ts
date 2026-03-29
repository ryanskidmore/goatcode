import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createHashlineReadEnhancerHandler } from "./handler";

const toolExecuteAfterHook = safeCreateHook(
  "hashline-read-enhancer",
  createHashlineReadEnhancerHandler,
);

export const hashlineReadEnhancerPlugin = definePlugin({
  name: "hashline-read-enhancer",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
});
