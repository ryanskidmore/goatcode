import { tool } from "@opencode-ai/plugin";
import { definePlugin } from "../../plugin-api/define-plugin";
import { executeSkill } from "./handler";
import type { SkillArgs } from "./types";

const SKILL_DESCRIPTION =
  "Load a skill or execute a slash command to get detailed instructions for a specific task.\n\n" +
  "Skills and commands provide specialized knowledge and step-by-step guidance.\n" +
  "Use this when a task matches an available skill's or command's description.\n\n" +
  "**How to use:**\n" +
  "- Call with a skill name: name='code-review'\n" +
  "- Call with a command name (without leading slash): name='publish'\n" +
  "- The tool will return detailed instructions with your context applied.";

const skillTool = tool({
  description: SKILL_DESCRIPTION,
  args: {
    name: tool.schema
      .string()
      .describe(
        "The skill or command name (e.g., 'code-review' or 'publish'). Use without leading slash for commands.",
      ),
    user_message: tool.schema
      .string()
      .optional()
      .describe(
        "Optional arguments or context for command invocation. Example: name='publish', user_message='patch'",
      ),
  },
  async execute(args: SkillArgs) {
    return executeSkill(args);
  },
});

export const skillPlugin = definePlugin({
  name: "skill",
  version: "0.1.0",
  tools: {
    skill: skillTool,
  },
});
