import { describe, it, expect } from "bun:test";
import { executeSkillMcp } from "./handler";

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
