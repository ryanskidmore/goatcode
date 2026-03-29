import type { AvailableCategory } from "../../types/category";
import { ORCHESTRATOR_PROMPT } from "../../agents/orchestrator/prompt";
import { log } from "../../shared/logger";
import { buildAgentTable } from "./agent-table-builder";
import type { AgentTableEntry } from "./agent-table-builder";
import { buildSkillsSection } from "./skill-section-builder";
import type { SkillEntry } from "./skill-section-builder";
import { buildCategoriesSection } from "./category-section-builder";

export interface DynamicPromptInput {
  agents: AgentTableEntry[];
  skills: SkillEntry[];
  categories: AvailableCategory[];
}

export function buildDynamicPrompt(input: DynamicPromptInput): string {
  const sections: string[] = [ORCHESTRATOR_PROMPT];

  const agentSection = buildAgentTable(input.agents);
  if (agentSection) {
    sections.push(agentSection);
  }

  const skillsSection = buildSkillsSection(input.skills);
  if (skillsSection) {
    sections.push(skillsSection);
  }

  const categoriesSection = buildCategoriesSection(input.categories);
  if (categoriesSection) {
    sections.push(categoriesSection);
  }

  const agentCount = input.agents.length;
  const skillCount = input.skills.length;
  const categoryCount = input.categories.length;
  log(
    `[PromptBuilder] Built dynamic prompt: ${agentCount} agents, ${skillCount} skills, ${categoryCount} categories`,
  );

  return sections.join("\n\n");
}
