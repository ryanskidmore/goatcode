import { definePlugin } from "../../plugin-api";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createPostReadNudgeHandler } from "./handler";

const postReadNudgeToolExecuteAfterHook = safeCreateHook(
  "post-read-nudge",
  createPostReadNudgeHandler,
);

export const postReadNudgePlugin = definePlugin({
  name: "post-read-nudge",
  version: "0.1.0",
  hooks: postReadNudgeToolExecuteAfterHook
    ? {
        "tool.execute.after": postReadNudgeToolExecuteAfterHook,
      }
    : {},
});
