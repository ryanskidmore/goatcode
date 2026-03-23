import type { Skill } from "./skill-loader"

export function mergeSkills(builtinSkills: Skill[], userSkills: Skill[]): Skill[] {
  const merged = new Map<string, Skill>()

  for (const builtinSkill of builtinSkills) {
    merged.set(builtinSkill.name, builtinSkill)
  }

  for (const userSkill of userSkills) {
    merged.set(userSkill.name, userSkill)
  }

  return Array.from(merged.values())
}
