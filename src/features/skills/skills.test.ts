import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMergedSkillLoader,
  gitGudSkill,
  loadProjectSkills,
  mergeSkills,
  registerProjectSkillLoader,
} from "./index";

const tempDirectories: string[] = [];

afterEach(() => {
  for (const tempDirectory of tempDirectories.splice(0)) {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

describe("#given builtin git-gud skill", () => {
  describe("#when reading its metadata", () => {
    it("#then it has name, description, and non-empty template", () => {
      expect(gitGudSkill.name).toBe("git-gud");
      expect(gitGudSkill.description.length).toBeGreaterThan(0);
      expect(gitGudSkill.template.length).toBeGreaterThan(0);
    });
  });
});

describe("#given project skills in .opencode/skills", () => {
  describe("#when loading markdown files", () => {
    it("#then frontmatter + body are parsed into skills", () => {
      const projectDirectory = createTempProjectDirectory();
      writeProjectSkill(
        projectDirectory,
        "release-checklist.md",
        `---
name: release-checklist
description: release readiness checks
---
Validate release notes and run smoke tests.
`,
      );

      const loaded = loadProjectSkills(projectDirectory);

      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual({
        name: "release-checklist",
        description: "release readiness checks",
        template: "Validate release notes and run smoke tests.",
      });
    });
  });
});

describe("#given builtin and user skills with same name", () => {
  describe("#when merging skills", () => {
    it("#then user skill overrides builtin by name", () => {
      const merged = mergeSkills(
        [{ name: "git-gud", description: "builtin", template: "builtin template" }],
        [{ name: "git-gud", description: "user", template: "user template" }],
      );

      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual({
        name: "git-gud",
        description: "user",
        template: "user template",
      });
    });
  });
});

describe("#given a user override file for git-gud", () => {
  describe("#when creating merged skill loader", () => {
    it("#then load('git-gud') returns user template", () => {
      const projectDirectory = createTempProjectDirectory();
      writeProjectSkill(
        projectDirectory,
        "git-gud.md",
        `---
name: git-gud
description: custom project git policy
---
Use custom git policy for this repository.
`,
      );

      const loader = createMergedSkillLoader(projectDirectory);

      expect(loader.load("git-gud")).toBe("Use custom git policy for this repository.");
    });
  });
});

describe("#given registerProjectSkillLoader", () => {
  describe("#when skillHandler.registerSkillLoader is not available", () => {
    it("#then logs that registration is unavailable without throwing", () => {
      //#given
      const projectDirectory = createTempProjectDirectory();

      //#when / #then — should not throw
      expect(() => registerProjectSkillLoader(projectDirectory)).not.toThrow();
    });
  });
});

function createTempProjectDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "goatcode-skills-"));
  tempDirectories.push(directory);
  return directory;
}

function writeProjectSkill(projectDirectory: string, fileName: string, contents: string): void {
  const skillDirectory = join(projectDirectory, ".opencode", "skills");
  mkdirSync(skillDirectory, { recursive: true });
  writeFileSync(join(skillDirectory, fileName), contents, "utf8");
}
