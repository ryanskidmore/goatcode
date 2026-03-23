import { log } from "../../shared/logger"
import type { SkillArgs, SkillLoader } from "./types"

let registeredLoader: SkillLoader | null = null

export function registerSkillLoader(loader: SkillLoader): void {
  registeredLoader = loader
}

export function executeSkill(args: SkillArgs): string {
  log("skill.execute", { name: args.name })

  if (registeredLoader) {
    const content = registeredLoader.load(args.name, args.user_message)
    if (content !== undefined) {
      return content
    }
  }

  return `Skill '${args.name}' not yet registered. Full skill system wired in Task 45.`
}
