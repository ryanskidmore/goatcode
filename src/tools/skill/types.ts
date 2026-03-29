export interface SkillArgs {
  name: string;
  user_message?: string;
}

export interface SkillLoader {
  load(name: string, userMessage?: string): string | undefined;
}
