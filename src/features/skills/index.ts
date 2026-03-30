import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

export function getBuiltinSkillsDir(): string | null {
  try {
    return join(getDataDir(), "goatcode-sh", "skills");
  } catch (err) {
    log("[skills] Failed to resolve built-in skills directory", { err });
    return null;
  }
}

export function syncBuiltinSkillFiles(): string | null {
  const skillsDir = getBuiltinSkillsDir();
  if (!skillsDir) return null;

  const builtinSkills = getBuiltinSkills();
  const expected = new Set(builtinSkills.map((skill) => skill.name));
  let syncFailed = false;

  try {
    mkdirSync(skillsDir, { recursive: true });
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !expected.has(entry.name)) {
        rmSync(join(skillsDir, entry.name), { recursive: true, force: true });
      }
    }
  } catch (err) {
    syncFailed = true;
    log("[skills] Failed to reconcile built-in skills directory", { err });
  }

  for (const skill of builtinSkills) {
    const skillDir = join(skillsDir, skill.name);
    const skillFile = join(skillDir, "SKILL.md");

    try {
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(skillFile, skillToMarkdown(skill), "utf8");
    } catch (err) {
      syncFailed = true;
      log(`[skills] Failed to write skill file: ${skillFile}`, { err });
    }
  }
  return syncFailed ? null : skillsDir;
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
