import { describe, it, expect, beforeEach } from "bun:test";
import { executeSkill, registerSkillLoader } from "./skill/handler";
import { resolveOperation, parseArguments, applyGrepFilter } from "./skill-mcp/handler";

describe("skill tool", () => {
  describe("#given no skill loader is registered", () => {
    beforeEach(() => {
      registerSkillLoader({ load: () => undefined });
    });

    describe("#when executeSkill is called with an unknown skill name", () => {
      it("#then returns placeholder message with the skill name", () => {
        const result = executeSkill({ name: "unknown-skill" });
        expect(result).toContain("unknown-skill");
        expect(result).toContain("not found");
      });
    });
  });

  describe("#given a skill loader is registered", () => {
    beforeEach(() => {
      registerSkillLoader({
        load: (name: string) => {
          if (name === "code-review") return "Code review instructions here.";
          return undefined;
        },
      });
    });

    describe("#when executeSkill is called with a known skill name", () => {
      it("#then returns the skill content from the loader", () => {
        const result = executeSkill({ name: "code-review" });
        expect(result).toBe("Code review instructions here.");
      });
    });

    describe("#when executeSkill is called with an unknown skill name", () => {
      it("#then returns placeholder message", () => {
        const result = executeSkill({ name: "nonexistent" });
        expect(result).toContain("nonexistent");
        expect(result).toContain("not found");
      });
    });
  });
});

describe("skill_mcp tool — resolveOperation", () => {
  describe("#given args with tool_name only", () => {
    describe("#when resolveOperation is called", () => {
      it("#then returns tool operation", () => {
        const op = resolveOperation({ mcp_name: "sqlite", tool_name: "query" });
        expect(op.type).toBe("tool");
        expect(op.name).toBe("query");
      });
    });
  });

  describe("#given args with resource_name only", () => {
    describe("#when resolveOperation is called", () => {
      it("#then returns resource operation", () => {
        const op = resolveOperation({ mcp_name: "memory", resource_name: "memory://notes" });
        expect(op.type).toBe("resource");
        expect(op.name).toBe("memory://notes");
      });
    });
  });

  describe("#given args with prompt_name only", () => {
    describe("#when resolveOperation is called", () => {
      it("#then returns prompt operation", () => {
        const op = resolveOperation({ mcp_name: "helper", prompt_name: "summarize" });
        expect(op.type).toBe("prompt");
        expect(op.name).toBe("summarize");
      });
    });
  });

  describe("#given args with no operation specified", () => {
    describe("#when resolveOperation is called", () => {
      it("#then throws an error", () => {
        expect(() => resolveOperation({ mcp_name: "sqlite" })).toThrow("Missing operation");
      });
    });
  });

  describe("#given args with multiple operations specified", () => {
    describe("#when resolveOperation is called", () => {
      it("#then throws an error", () => {
        expect(() =>
          resolveOperation({ mcp_name: "sqlite", tool_name: "query", resource_name: "res://foo" }),
        ).toThrow("Multiple operations specified");
      });
    });
  });
});

describe("skill_mcp tool — parseArguments", () => {
  describe("#given undefined arguments", () => {
    describe("#when parseArguments is called", () => {
      it("#then returns empty object", () => {
        expect(parseArguments(undefined)).toEqual({});
      });
    });
  });

  describe("#given a JSON string argument", () => {
    describe("#when parseArguments is called", () => {
      it("#then parses and returns the object", () => {
        const result = parseArguments('{"sql": "SELECT 1"}');
        expect(result).toEqual({ sql: "SELECT 1" });
      });
    });
  });

  describe("#given a JSON string wrapped in single quotes", () => {
    describe("#when parseArguments is called", () => {
      it("#then strips quotes and parses correctly", () => {
        const result = parseArguments('\'{"key": "value"}\'');
        expect(result).toEqual({ key: "value" });
      });
    });
  });

  describe("#given an object argument", () => {
    describe("#when parseArguments is called", () => {
      it("#then returns the object as-is", () => {
        const input = { key: "value" };
        expect(parseArguments(input)).toBe(input);
      });
    });
  });

  describe("#given an invalid JSON string", () => {
    describe("#when parseArguments is called", () => {
      it("#then throws an error with context", () => {
        expect(() => parseArguments("not-json")).toThrow("Invalid arguments JSON");
      });
    });
  });
});

describe("skill_mcp tool — applyGrepFilter", () => {
  describe("#given no grep pattern", () => {
    describe("#when applyGrepFilter is called", () => {
      it("#then returns output unchanged", () => {
        const output = "line one\nline two";
        expect(applyGrepFilter(output, undefined)).toBe(output);
      });
    });
  });

  describe("#given a grep pattern that matches some lines", () => {
    describe("#when applyGrepFilter is called", () => {
      it("#then returns only matching lines", () => {
        const output = "error: something\ninfo: ok\nerror: another";
        const result = applyGrepFilter(output, "error");
        expect(result).toBe("error: something\nerror: another");
      });
    });
  });

  describe("#given a grep pattern that matches no lines", () => {
    describe("#when applyGrepFilter is called", () => {
      it("#then returns no-match message", () => {
        const output = "info: ok\ninfo: good";
        const result = applyGrepFilter(output, "error");
        expect(result).toContain("[grep] No lines matched pattern: error");
      });
    });
  });
});
