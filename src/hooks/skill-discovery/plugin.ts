import { definePlugin } from "../../plugin-api/define-plugin";
import { getAvailableSkills } from "../../tools/skill/handler";

function buildSkillsSystemBlock(): string | null {
  const skills = getAvailableSkills();
  if (skills.length === 0) return null;

  const lines = skills.map(
    (s) => `- **${s.name}**${s.description ? ` — ${s.description}` : ""}`,
  );

  return [
    "## Available Skills",
    "",
    "Use the `skill` tool to load any of these skills by name:",
    ...lines,
  ].join("\n");
}

export const skillDiscoveryPlugin = definePlugin({
  name: "skill-discovery",
  version: "0.1.0",
  hooks: {
    "experimental.chat.system.transform": async (
      _input: { sessionID?: string; model: unknown },
      output: { system: string[] },
    ) => {
      const block = buildSkillsSystemBlock();
      if (block) {
        output.system.push(block);
      }
    },
    "tool.definition": async (
      input: { toolID: string },
      output: { description: string; parameters: unknown },
    ) => {
      if (input.toolID !== "skill") return;

      const skills = getAvailableSkills();
      if (skills.length === 0) return;

      const listing = skills
        .map((s) => `  - ${s.name}${s.description ? `: ${s.description}` : ""}`)
        .join("\n");

      output.description += `\n\nAvailable skills:\n${listing}`;
    },
  },
});
