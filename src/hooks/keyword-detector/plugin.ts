import { definePlugin } from "../../plugin-api/define-plugin";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createKeywordDetectorHandler, clearSessionMode } from "./handler";

const chatMessageHook = safeCreateHook("keyword-detector", createKeywordDetectorHandler);

export const keywordDetectorPlugin = definePlugin({
  name: "keyword-detector",
  version: "0.1.0",
  hooks: chatMessageHook
    ? {
        "chat.message": chatMessageHook,
        event: async (input) => {
          const evt = (input as { event?: { type?: string; properties?: unknown } }).event;
          if (evt?.type === "session.deleted") {
            const props = evt.properties as Record<string, unknown> | undefined;
            const sessionID = (props?.sessionID ??
              (props?.info as Record<string, unknown> | undefined)?.id) as string | undefined;
            if (sessionID) clearSessionMode(sessionID);
          }
        },
      }
    : {},
});
