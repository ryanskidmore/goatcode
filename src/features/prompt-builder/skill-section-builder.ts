export interface SkillEntry {
  name: string;
  description: string;
}

function normaliseInline(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}

export function buildSkillsSection(skills: SkillEntry[]): string {
  if (skills.length === 0) return "";

  const items = skills.map((skill) => {
    const shortDesc = skill.description.split(".")[0] || skill.description;
    return `- \`${normaliseInline(skill.name)}\`: ${normaliseInline(shortDesc)}`;
  });

  return [
    "### Available Skills",
    "",
    "Use the `skill` tool to load a skill before delegating work.",
    "",
    ...items,
  ].join("\n");
}
