import { log } from "../../shared/logger";
import type { SkillArgs, SkillInfo, SkillLoader } from "./types";

let registeredLoader: SkillLoader | null = null;

export function registerSkillLoader(loader: SkillLoader): void {
  registeredLoader = loader;
}

export function getAvailableSkills(): SkillInfo[] {
  return registeredLoader?.list() ?? [];
}

export function executeSkill(args: SkillArgs): string {
  log("skill.execute", { name: args.name });

  if (registeredLoader) {
    const content = registeredLoader.load(args.name, args.user_message);
    if (content !== undefined) {
      return content;
    }
  }

  const available = getAvailableSkills();
  const names = available.map((s) => s.name).join(", ");
  return `Skill '${args.name}' not found. Available: ${names || "none"}. Add project skills in .opencode/skills/.`;
}
