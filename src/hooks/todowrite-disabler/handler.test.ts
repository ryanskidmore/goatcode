import { describe, expect, it } from "bun:test";

import {
  createTodowriteDisablerHandler,
  SUBAGENT_TODOWRITE_BLOCK_MESSAGE,
  BLOCKED_TOOLS,
} from "./handler";

describe("createTodowriteDisablerHandler", () => {
  describe("#given a subagent context (agent is explore)", () => {
    describe("#when TodoWrite is called", () => {
      it("#then throws with the block message", async () => {
        const handler = createTodowriteDisablerHandler("explore");
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE);
      });
    });

    describe("#when TodoRead is called", () => {
      it("#then throws with the block message", async () => {
        const handler = createTodowriteDisablerHandler("explore");
        const input = { tool: "TodoRead", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE);
      });
    });

    describe("#when a non-blocked tool is called", () => {
      it("#then does not throw", async () => {
        const handler = createTodowriteDisablerHandler("explore");
        const input = { tool: "Read", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).resolves.toBeUndefined();
      });
    });
  });

  describe("#given a subagent context (agent is oracle)", () => {
    describe("#when TodoWrite is called with lowercase tool name", () => {
      it("#then throws because matching is case-insensitive", async () => {
        const handler = createTodowriteDisablerHandler("oracle");
        const input = { tool: "todowrite", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE);
      });
    });

    describe("#when TodoRead is called with mixed case", () => {
      it("#then throws because matching is case-insensitive", async () => {
        const handler = createTodowriteDisablerHandler("oracle");
        const input = { tool: "TODOREAD", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE);
      });
    });
  });

  describe("#given an orchestrator context", () => {
    describe("#when TodoWrite is called", () => {
      it("#then does not throw because orchestrator is allowed", async () => {
        const handler = createTodowriteDisablerHandler("orchestrator");
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).resolves.toBeUndefined();
      });
    });

    describe("#when TodoRead is called", () => {
      it("#then does not throw because orchestrator is allowed", async () => {
        const handler = createTodowriteDisablerHandler("orchestrator");
        const input = { tool: "TodoRead", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).resolves.toBeUndefined();
      });
    });
  });

  describe("#given no agent name (undefined)", () => {
    describe("#when TodoWrite is called", () => {
      it("#then does not throw because undefined is not a subagent", async () => {
        const handler = createTodowriteDisablerHandler(undefined);
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).resolves.toBeUndefined();
      });
    });
  });

  describe("#given a worker subagent context", () => {
    describe("#when TodoWrite is called", () => {
      it("#then throws because worker is not in ORCHESTRATOR_AGENTS", async () => {
        const handler = createTodowriteDisablerHandler("worker");
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" };
        const output = { args: {} };

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE);
      });
    });
  });

  describe("#given the BLOCKED_TOOLS constant", () => {
    describe("#when checking the blocked list", () => {
      it("#then includes TodoWrite and TodoRead", () => {
        expect(BLOCKED_TOOLS).toContain("TodoWrite");
        expect(BLOCKED_TOOLS).toContain("TodoRead");
        expect(BLOCKED_TOOLS.length).toBe(2);
      });
    });
  });
});
