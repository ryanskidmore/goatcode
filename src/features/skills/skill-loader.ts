import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { log } from "../../shared/logger";

export type Skill = {
  name: string;
  description: string;
  template: string;
};

export type SkillLoader = {
  load(name: string): string | undefined;
};

type ParsedSkillFrontmatter = {
  name?: string;
  description?: string;
  body: string;
};

const SKILLS_RELATIVE_DIR = ".opencode/skills";

export function parseSkillMarkdown(markdown: string): ParsedSkillFrontmatter {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { body: normalized.trim() };
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex < 0) {
    return { body: normalized.trim() };
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const body = normalized.slice(closingIndex + 5).trim();
  const parsed: ParsedSkillFrontmatter = { body };

  for (const line of frontmatterBlock.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = stripSurroundingQuotes(rawValue);

    if (key === "name") {
      parsed.name = value;
      continue;
    }

    if (key === "description") {
      parsed.description = value;
    }
  }

  return parsed;
}

export function loadProjectSkills(directory: string): Skill[] {
  const skillsDir = join(directory, SKILLS_RELATIVE_DIR);
  if (!existsSync(skillsDir)) {
    return [];
  }

  const files = readdirSync(skillsDir).filter((entry) => entry.endsWith(".md"));
  const skills: Skill[] = [];

  for (const fileName of files) {
    const filePath = join(skillsDir, fileName);

    try {
      const content = readFileSync(filePath, "utf8");
      const parsed = parseSkillMarkdown(content);
      const fallbackName = basename(fileName, ".md");
      const name = parsed.name?.trim() || fallbackName;
      const description = parsed.description?.trim() || "";
      const template = parsed.body.trim();

      if (!name || !template) {
        log("[skills] skipped invalid project skill", {
          filePath,
          name,
          hasTemplate: template.length > 0,
        });
        continue;
      }

      skills.push({ name, description, template });
    } catch (error) {
      log("[skills] failed to load project skill file", { filePath, error });
    }
  }

  return skills;
}

export function createProjectSkillLoader(directory: string): SkillLoader {
  const byName = new Map(loadProjectSkills(directory).map((skill) => [skill.name, skill.template]));

  return {
    load(name: string): string | undefined {
      return byName.get(name);
    },
  };
}

function stripSurroundingQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}
