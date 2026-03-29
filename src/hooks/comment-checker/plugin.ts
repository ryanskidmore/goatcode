import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createCommentCheckerHandler } from "./handler";

const preToolUseHook = safeCreateHook("comment-checker", createCommentCheckerHandler);

export const commentCheckerPlugin = definePlugin({
  name: "comment-checker",
  version: "0.1.0",
  hooks: preToolUseHook
    ? {
        "tool.execute.before": preToolUseHook,
      }
    : {},
});
