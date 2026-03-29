import type { OpenCodeContext } from "../../types/plugin";
import { definePlugin } from "../../plugin-api/define-plugin";
import { createWriteFileGuardHandler } from "./handler";

let handlers: ReturnType<typeof createWriteFileGuardHandler> | null = null;

export const writeFileGuardPlugin = definePlugin({
  name: "write-file-guard",
  version: "0.1.0",
  setup(ctx: OpenCodeContext) {
    handlers = createWriteFileGuardHandler(ctx.directory);
  },
  hooks: {
    "tool.execute.before": async (input: unknown, output: unknown) => {
      if (!handlers) return;
      await handlers.preToolUse(input, output);
    },
    event: async (input: unknown) => {
      if (!handlers) return;
      await handlers.event(input);
    },
  },
});
