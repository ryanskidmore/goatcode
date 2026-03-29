import { describe, it, expect, beforeEach } from "bun:test";
import { executeSkill, registerSkillLoader } from "./handler";

describe("executeSkill", () => {
  describe("#given a skill loader that returns content for known skills", () => {
    beforeEach(() => {
      registerSkillLoader({
        load: (name: string, userMessage?: string) => {
          if (name === "git-master") return "Git workflow instructions";
          if (name === "with-msg" && userMessage) return `Context: ${userMessage}`;
          return undefined;
        },
      });
    });

    describe("#when called with a known skill name", () => {
      it("#then returns the skill content from the loader", () => {
        const result = executeSkill({ name: "git-master" });
        expect(result).toBe("Git workflow instructions");
      });
    });

    describe("#when called with an unknown skill name", () => {
      it("#then returns a not-found message containing the skill name", () => {
        const result = executeSkill({ name: "nonexistent-skill" });
        expect(result).toContain("nonexistent-skill");
        expect(result).toContain("not found");
      });
    });

    describe("#when called with a user_message argument", () => {
      it("#then forwards user_message to the loader", () => {
        const result = executeSkill({ name: "with-msg", user_message: "patch release" });
        expect(result).toBe("Context: patch release");
      });
    });
  });

  describe("#given a loader that always returns undefined", () => {
    beforeEach(() => {
      registerSkillLoader({ load: () => undefined });
    });

    describe("#when executeSkill is called", () => {
      it("#then returns the not-found message with available sources", () => {
        const result = executeSkill({ name: "missing" });
        expect(result).toContain("missing");
        expect(result).toContain("not found");
        expect(result).toContain("builtin skills");
      });
    });
  });
});
