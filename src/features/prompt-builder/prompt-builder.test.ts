import { describe, expect, it } from "bun:test";

import type { AgentTableEntry } from "./agent-table-builder";
import { buildAgentTable } from "./agent-table-builder";
import type { SkillEntry } from "./skill-section-builder";
import { buildSkillsSection } from "./skill-section-builder";
import { buildCategoriesSection } from "./category-section-builder";
import { buildDynamicPrompt } from "./dynamic-prompt-builder";
import { ORCHESTRATOR_PROMPT } from "../../agents/orchestrator/prompt";
import type { AvailableCategory } from "../../types/category";

const SAMPLE_AGENTS: AgentTableEntry[] = [
  {
    name: "explorer",
    description: "Searches the codebase for patterns.",
    whenToUse: "Need to find code references",
  },
  {
    name: "deepworker",
    description: "Autonomous implementation agent.",
    whenToUse: "Complex multi-file changes",
  },
  {
    name: "advisor",
    description: "Read-only architecture consultant.",
    whenToUse: "Design decisions and debugging",
  },
];

const SAMPLE_SKILLS: SkillEntry[] = [
  { name: "playwright", description: "Browser automation and testing." },
  { name: "git-gud", description: "Atomic commits and rebase surgery." },
];

const SAMPLE_CATEGORIES: AvailableCategory[] = [
  { name: "visual-engineering", description: "Frontend and UI/UX work", model: "gpt-5.3-codex" },
  { name: "ultrabrain", description: "Hard logic and architecture", model: "gpt-5.4" },
  { name: "quick", description: "Trivial single-file fixes", model: "gpt-5-nano" },
];

describe("prompt-builder", () => {
  describe("#given buildAgentTable", () => {
    describe("#when called with agents", () => {
      it("#then returns markdown table containing all agent names", () => {
        //#given
        const agents = SAMPLE_AGENTS;

        //#when
        const result = buildAgentTable(agents);

        //#then
        expect(result).toContain("explorer");
        expect(result).toContain("deepworker");
        expect(result).toContain("advisor");
        expect(result).toContain("| Agent | Description | When to Use |");
      });

      it("#then truncates descriptions at the first period", () => {
        //#given
        const agents: AgentTableEntry[] = [
          {
            name: "test-agent",
            description: "First sentence. Second sentence.",
            whenToUse: "Always",
          },
        ];

        //#when
        const result = buildAgentTable(agents);

        //#then
        expect(result).toContain("First sentence");
        expect(result).not.toContain("Second sentence");
      });

      it("#then returns full description when no period present", () => {
        //#given
        const agents: AgentTableEntry[] = [
          { name: "test-agent", description: "No period here", whenToUse: "Always" },
        ];

        //#when
        const result = buildAgentTable(agents);

        //#then
        expect(result).toContain("No period here");
      });
    });

    describe("#when called with empty array", () => {
      it("#then returns empty string", () => {
        //#given #when
        const result = buildAgentTable([]);

        //#then
        expect(result).toBe("");
      });
    });
  });

  describe("#given buildSkillsSection", () => {
    describe("#when called with skills", () => {
      it("#then returns section containing all skill names", () => {
        //#given
        const skills = SAMPLE_SKILLS;

        //#when
        const result = buildSkillsSection(skills);

        //#then
        expect(result).toContain("playwright");
        expect(result).toContain("git-gud");
        expect(result).toContain("### Available Skills");
      });
    });

    describe("#when called with empty array", () => {
      it("#then returns empty string", () => {
        //#given #when
        const result = buildSkillsSection([]);

        //#then
        expect(result).toBe("");
      });
    });
  });

  describe("#given buildCategoriesSection", () => {
    describe("#when called with categories", () => {
      it("#then returns table with category names and models", () => {
        //#given
        const categories = SAMPLE_CATEGORIES;

        //#when
        const result = buildCategoriesSection(categories);

        //#then
        expect(result).toContain("visual-engineering");
        expect(result).toContain("gpt-5.3-codex");
        expect(result).toContain("ultrabrain");
        expect(result).toContain("gpt-5.4");
        expect(result).toContain("quick");
        expect(result).toContain("gpt-5-nano");
      });

      it("#then shows 'default' when model is undefined", () => {
        //#given
        const categories: AvailableCategory[] = [
          { name: "unspecified-low", description: "General purpose" },
        ];

        //#when
        const result = buildCategoriesSection(categories);

        //#then
        expect(result).toContain("default");
      });

      it("#then escapes pipe characters in descriptions", () => {
        //#given
        const categories: AvailableCategory[] = [
          { name: "test-cat", description: "Contains | pipe character", model: "gpt-5" },
        ];

        //#when
        const result = buildCategoriesSection(categories);

        //#then
        expect(result).toContain("Contains \\| pipe character");
        expect(result).not.toContain("Contains | pipe character");
      });
    });

    describe("#when called with empty array", () => {
      it("#then returns empty string", () => {
        //#given #when
        const result = buildCategoriesSection([]);

        //#then
        expect(result).toBe("");
      });
    });
  });

  describe("#given buildDynamicPrompt", () => {
    describe("#when called with agents, skills, and categories", () => {
      it("#then composes prompt containing base orchestrator prompt and all sections", () => {
        //#given
        const input = {
          agents: SAMPLE_AGENTS,
          skills: SAMPLE_SKILLS,
          categories: SAMPLE_CATEGORIES,
        };

        //#when
        const result = buildDynamicPrompt(input);

        //#then
        expect(result).toContain(ORCHESTRATOR_PROMPT);
        expect(result).toContain("explorer");
        expect(result).toContain("deepworker");
        expect(result).toContain("playwright");
        expect(result).toContain("git-gud");
        expect(result).toContain("visual-engineering");
        expect(result).toContain("gpt-5.3-codex");
      });
    });

    describe("#when called with empty inputs", () => {
      it("#then returns only the base orchestrator prompt", () => {
        //#given
        const input = { agents: [], skills: [], categories: [] };

        //#when
        const result = buildDynamicPrompt(input);

        //#then
        expect(result).toBe(ORCHESTRATOR_PROMPT);
        expect(result).not.toContain("### Available Agents");
        expect(result).not.toContain("### Available Skills");
        expect(result).not.toContain("### Category Mapping");
      });
    });

    describe("#when called with partial inputs", () => {
      it("#then includes only populated sections", () => {
        //#given
        const input = {
          agents: SAMPLE_AGENTS,
          skills: [],
          categories: [],
        };

        //#when
        const result = buildDynamicPrompt(input);

        //#then
        expect(result).toContain("### Available Agents");
        expect(result).not.toContain("### Available Skills");
        expect(result).not.toContain("### Category Mapping");
      });
    });
  });
});
