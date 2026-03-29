import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import {
  createHashlineDiffEnhancerBeforeHandler,
  createHashlineDiffEnhancerAfterHandler,
} from "./handler";

const toolExecuteBeforeHook = safeCreateHook(
  "hashline-diff-enhancer-before",
  createHashlineDiffEnhancerBeforeHandler,
);
const toolExecuteAfterHook = safeCreateHook(
  "hashline-diff-enhancer-after",
  createHashlineDiffEnhancerAfterHandler,
);

export const hashlineDiffEnhancerPlugin = definePlugin({
  name: "hashline-diff-enhancer",
  version: "0.1.0",
  hooks: {
    ...(toolExecuteBeforeHook ? { "tool.execute.before": toolExecuteBeforeHook } : {}),
    ...(toolExecuteAfterHook ? { "tool.execute.after": toolExecuteAfterHook } : {}),
  },
});
