import { tool } from "@opencode-ai/plugin";
import type { OpenCodeContext } from "../../../types/plugin";
import { getBackgroundAgent } from "../../../runtime";
import { definePlugin } from "../../../plugin-api/define-plugin";
import { handleBackgroundCancel } from "./handler";
import { resolveParentSessionID, extractDelegationDepth } from "../../delegate-task/handler";
import type { BackgroundCancelArgs } from "./types";

const backgroundCancelTool = tool({
  description: "Cancel running background task(s). Use all=true to cancel ALL before final answer.",
  args: {
    task_id: tool.schema.string().optional().describe("Task ID to cancel (required if all=false)"),
    all: tool.schema
      .boolean()
      .optional()
      .describe("Cancel all running background tasks (default: false)"),
  },
  async execute(args: BackgroundCancelArgs, toolContext) {
    const { manager } = getBackgroundAgent();
    const callerSessionID = resolveParentSessionID(toolContext);

    // Resolve delegation depth to scope cancellation.
    // Root orchestrator (depth=0) gets global cancel; sub-agents only cancel their own children.
    // IMPORTANT: null/error must NOT default to 0 — that would grant root-level cancel
    // authority to any agent whose depth can't be determined (fail-closed, not fail-open).
    let delegationDepth: number | undefined;
    if (callerSessionID) {
      try {
        const client = (toolContext as unknown as OpenCodeContext).client;
        const depth = await extractDelegationDepth(client, callerSessionID);
        if (depth === null) {
          // Can't determine depth — fail closed by refusing global cancel
          return handleBackgroundCancel(manager, toolContext as unknown as OpenCodeContext, args);
        }
        delegationDepth = depth;
      } catch {
        // Transient error — fail closed by refusing global cancel
        return handleBackgroundCancel(manager, toolContext as unknown as OpenCodeContext, args);
      }
    } else {
      // No session ID means root orchestrator context
      delegationDepth = 0;
    }

    return handleBackgroundCancel(manager, toolContext as unknown as OpenCodeContext, args, {
      callerSessionID,
      delegationDepth,
    });
  },
});

export default definePlugin({
  name: "background-cancel",
  version: "1.0.0",
  dependencies: ["delegate-task"],
  tools: {
    background_cancel: backgroundCancelTool,
  },
});
