import type { ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundAgentManager } from "../../runtime";
import type { TaskInput, CategoryConfig } from "./types";
import type { ExecutorDeps } from "./executor";
import { z } from "zod";

import { buildTool } from "../tool-builder";
import { getClientFromToolContext } from "../lsp/client";
import { resolveCategory } from "./category-resolver";
import { executeBackground, executeSync } from "./executor";
import { CATEGORY_NAMES } from "./constants";
import { log } from "../../shared/logger";

const categoryListForDescription = CATEGORY_NAMES.map((name) => `"${name}"`).join(", ");

const taskArgsSchema = z.object({
  category: z.string().describe(`Category to route to. One of: ${categoryListForDescription}`),
  description: z.string().describe("Short 3-5 word task description"),
  prompt: z.string().describe("Full prompt/instructions for the delegated agent"),
  load_skills: z.array(z.string()).optional().describe("Skill names to inject"),
  run_in_background: z
    .boolean()
    .describe("true: async (returns task_id), false: sync (waits for result)"),
  session_id: z.string().optional().describe("Resume an existing session"),
});

export function createTaskTool(getManager: () => BackgroundAgentManager): ToolDefinition {
  return buildTool({
    description: [
      "Delegate a task to a category-based agent.",
      `Available categories: ${categoryListForDescription}.`,
      "Set run_in_background=true for async execution (returns task_id), false for sync.",
    ].join(" "),
    args: taskArgsSchema.shape as unknown as ToolDefinition["args"],
    execute: async (rawArgs, toolContext) => {
      const args = taskArgsSchema.parse(rawArgs);
      const input: TaskInput = {
        category: args.category,
        description: args.description,
        prompt: args.prompt,
        load_skills: args.load_skills,
        run_in_background: args.run_in_background,
        session_id: args.session_id,
      };

      const config = resolveCategory(input.category) as CategoryConfig | undefined;
      if (!config) {
        const available = CATEGORY_NAMES.join(", ");
        log("[delegate-task] Unknown category", { category: input.category });
        return `Unknown category: "${input.category}". Available: ${available}`;
      }

      const client = getClientFromToolContext(toolContext);
      const manager = getManager();
      const deps: ExecutorDeps = {
        manager,
        client,
        directory: toolContext.directory,
      };

      log("[delegate-task] Routing task", {
        category: input.category,
        model: config.model,
        background: input.run_in_background,
      });

      if (input.run_in_background) {
        return executeBackground(input, config, deps);
      }

      return executeSync(input, config, deps);
    },
  });
}
