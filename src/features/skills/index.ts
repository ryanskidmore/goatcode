import { log } from "../../shared/logger"
import { gitMasterSkill } from "./builtin/git-master"
import { createProjectSkillLoader, loadProjectSkills, type Skill, type SkillLoader } from "./skill-loader"
import { mergeSkills } from "./skill-merger"
import * as skillHandler from "../../tools/skill/handler"

export { gitMasterSkill } from "./builtin/git-master"
export { createProjectSkillLoader, loadProjectSkills } from "./skill-loader"
export { mergeSkills } from "./skill-merger"
export type { Skill, SkillLoader } from "./skill-loader"

export function getBuiltinSkills(): Skill[] {
  return [gitMasterSkill]
}

export function createMergedSkillLoader(directory: string): SkillLoader {
  const projectSkills = loadProjectSkills(directory)
  const mergedSkills = mergeSkills(getBuiltinSkills(), projectSkills)
  const byName = new Map(mergedSkills.map((skill) => [skill.name, skill.template]))

  return {
    load(name: string): string | undefined {
      return byName.get(name)
    },
  }
}

export function registerProjectSkillLoader(directory: string): void {
  const loader = createMergedSkillLoader(directory)

  if (typeof skillHandler.registerSkillLoader === "function") {
    skillHandler.registerSkillLoader(loader)
    return
  }

  log("[skills] registerSkillLoader not available in handler module")
}

