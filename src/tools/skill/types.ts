export interface SkillArgs {
  name: string;
  user_message?: string;
}

export interface SkillInfo {
  name: string;
  description: string;
}

export interface SkillLoader {
  load(name: string, userMessage?: string): string | undefined;
  list(): SkillInfo[];
}
