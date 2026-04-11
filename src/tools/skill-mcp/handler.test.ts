import { describe, it, expect } from "bun:test";
import { executeSkillMcp, resolveOperation, parseArguments, applyGrepFilter } from "./handler";

describe("executeSkillMcp", () => {
  describe("#given args with exactly one tool_name", () => {
    describe("#when executeSkillMcp is called", () => {
      it("#then returns a message with pending implementation and operation details", async () => {
        const result = await executeSkillMcp({
          mcp_name: "sqlite",
          tool_name: "query",
        });
        expect(result).toContain("not yet available");
        expect(result).toContain("tool");
        expect(result).toContain("query");
      });
    });
  });

  describe("#given args with no operation specified", () => {
    describe("#when executeSkillMcp is called", () => {
      it("#then rejects with a missing operation error", async () => {
        await expect(executeSkillMcp({ mcp_name: "sqlite" })).rejects.toThrow("Missing operation");
      });
    });
  });

  describe("#given args with multiple operations specified", () => {
    describe("#when executeSkillMcp is called", () => {
      it("#then rejects with a multiple operations error", async () => {
        await expect(
          executeSkillMcp({
            mcp_name: "sqlite",
            tool_name: "query",
            resource_name: "res://data",
          }),
        ).rejects.toThrow("Multiple operations specified");
      });
    });
  });

  describe("#given args with valid JSON string arguments", () => {
    describe("#when executeSkillMcp is called", () => {
      it("#then parses arguments and returns operation info", async () => {
        const result = await executeSkillMcp({
          mcp_name: "memory",
          resource_name: "memory://notes",
          arguments: '{"limit": 10}',
        });
        expect(result).toContain("resource");
        expect(result).toContain("memory://notes");
      });
    });
  });

  describe("#given args with invalid JSON string arguments", () => {
    describe("#when executeSkillMcp is called", () => {
      it("#then rejects with an invalid JSON error", async () => {
        await expect(
          executeSkillMcp({
            mcp_name: "sqlite",
            tool_name: "query",
            arguments: "not-valid-json",
          }),
        ).rejects.toThrow("Invalid arguments JSON");
      });
    });
  });
});

describe("resolveOperation", () => {
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

describe("parseArguments", () => {
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
        const result = parseArguments(String.raw`'{"key": "value"}'`);
        // string value is: '{"key": "value"}' — outer single quotes get stripped
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

describe("applyGrepFilter", () => {
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
