import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "../../shared/logger";
import { getDataDir } from "../../shared/data-path";
import { gitMasterSkill } from "./builtin/git-master";
import {
  createProjectSkillLoader,
  loadProjectSkills,
  type Skill,
  type SkillLoader,
} from "./skill-loader";
import { mergeSkills } from "./skill-merger";
import * as skillHandler from "../../tools/skill/handler";

export { gitMasterSkill } from "./builtin/git-master";
export { createProjectSkillLoader, loadProjectSkills } from "./skill-loader";
export { mergeSkills } from "./skill-merger";
export type { Skill, SkillInfo, SkillLoader } from "./skill-loader";

export function getBuiltinSkills(): Skill[] {
  return [gitMasterSkill];
}

function skillToMarkdown(skill: Skill): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.template.trim()}\n`;
}

export function getBuiltinSkillsDir(): string {
  return join(getDataDir(), "goatcode-sh", "skills");
}

export function syncBuiltinSkillFiles(): string {
  const skillsDir = getBuiltinSkillsDir();
  for (const skill of getBuiltinSkills()) {
    const skillDir = join(skillsDir, skill.name);
    const skillFile = join(skillDir, "SKILL.md");

    try {
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(skillFile, skillToMarkdown(skill), "utf8");
    } catch (err) {
      log(`[skills] Failed to write skill file: ${skillFile}`, { err });
    }
  }
  return skillsDir;
}

export function createMergedSkillLoader(directory: string): SkillLoader {
  const projectSkills = loadProjectSkills(directory);
  const mergedSkills = mergeSkills(getBuiltinSkills(), projectSkills);
  const byName = new Map(mergedSkills.map((skill) => [skill.name, skill.template]));

  return {
    load(name: string): string | undefined {
      return byName.get(name);
    },
    list() {
      return mergedSkills.map((s) => ({ name: s.name, description: s.description }));
    },
  };
}

export function registerProjectSkillLoader(directory: string): void {
  syncBuiltinSkillFiles();

  if (typeof skillHandler.registerSkillLoader === "function") {
    const loader = createMergedSkillLoader(directory);
    skillHandler.registerSkillLoader(loader);
    return;
  }

  log("[skills] registerSkillLoader not available in handler module");
}
