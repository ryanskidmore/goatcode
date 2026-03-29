import { definePlugin } from "../../plugin-api";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createPreemptiveCompactionHandler } from "./handler";

const preemptiveCompactionMessageHook = safeCreateHook("preemptive-compaction", () =>
  createPreemptiveCompactionHandler(),
);

export const preemptiveCompactionPlugin = definePlugin({
  name: "preemptive-compaction",
  version: "0.1.0",
  hooks: preemptiveCompactionMessageHook
    ? { "chat.message": preemptiveCompactionMessageHook }
    : undefined,
});
