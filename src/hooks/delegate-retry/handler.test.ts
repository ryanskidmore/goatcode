import { describe, expect, it } from "bun:test";

import { createDelegateRetryHandler, detectDelegateTaskError, buildRetryGuidance } from "./handler";

describe("createDelegateRetryHandler", () => {
  describe("#given a task tool with an error output", () => {
    describe("#when the output contains [ERROR] and run_in_background pattern", () => {
      it("#then injects retry guidance with the correct error type", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "[ERROR] Invalid arguments: run_in_background is required",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("[task CALL FAILED - IMMEDIATE RETRY REQUIRED]");
        expect(output.output).toContain("missing_run_in_background");
        expect(output.output).toContain("Action");
      });
    });

    describe("#when the output contains Invalid arguments with Unknown agent", () => {
      it("#then injects guidance for unknown_agent error", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "Invalid arguments: Unknown agent 'badagent'. Available agents: explore, oracle",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("unknown_agent");
        expect(output.output).toContain("Available Options");
        expect(output.output).toContain("explore, oracle");
      });
    });

    describe("#when the output contains Cannot call primary agent", () => {
      it("#then injects guidance for primary_agent error", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "Task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "[ERROR] Cannot call primary agent directly.",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("primary_agent");
        expect(output.output).toContain("subagent");
      });
    });
  });

  describe("#given a task tool with a successful output", () => {
    describe("#when the output has no error markers", () => {
      it("#then does not modify the output", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const original = "Agent completed the work successfully. Session ID: ses_abc";
        const output = { title: "task", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a task tool with output that has no string output field", () => {
    describe("#when output.output is undefined", () => {
      it("#then does not modify the output", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: undefined as unknown as string, metadata: {} };

        await handler(input, output);

        expect(output.output).toBeUndefined();
      });
    });
  });

  describe("#given a task tool with case-insensitive matching", () => {
    describe("#when the tool name is TASK in uppercase", () => {
      it("#then still detects the error and injects guidance", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "TASK", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "[ERROR] Agent name cannot be empty",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("empty_agent");
        expect(output.output).toContain("[task CALL FAILED - IMMEDIATE RETRY REQUIRED]");
      });
    });
  });

  describe("#given a non-task tool", () => {
    describe("#when the tool is Bash with error markers in output", () => {
      it("#then does not inject guidance", async () => {
        const handler = createDelegateRetryHandler();
        const input = { tool: "Bash", sessionID: "s1", callID: "c1", args: {} };
        const original = "[ERROR] Invalid arguments: run_in_background is required";
        const output = { title: "Bash", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });
});

describe("detectDelegateTaskError", () => {
  describe("#given output with [ERROR] and a known pattern", () => {
    describe("#when output matches load_skills pattern", () => {
      it("#then returns missing_load_skills error", () => {
        const result = detectDelegateTaskError(
          "[ERROR] Invalid arguments: load_skills parameter is missing",
        );
        expect(result).not.toBeNull();
        expect(result?.errorType).toBe("missing_load_skills");
        expect(result?.originalOutput).toContain("load_skills");
      });
    });

    describe("#when output matches Skills not found pattern", () => {
      it("#then returns unknown_skills error", () => {
        const result = detectDelegateTaskError(
          "[ERROR] Skills not found: badskill. Available skills: git-master",
        );
        expect(result).not.toBeNull();
        expect(result?.errorType).toBe("unknown_skills");
      });
    });
  });

  describe("#given output with [ERROR] but no known pattern", () => {
    describe("#when the error text does not match any pattern", () => {
      it("#then returns null", () => {
        const result = detectDelegateTaskError("[ERROR] Some completely unknown error occurred");
        expect(result).toBeNull();
      });
    });
  });

  describe("#given output without any error markers", () => {
    describe("#when output is a success message", () => {
      it("#then returns null", () => {
        const result = detectDelegateTaskError("All tasks completed.");
        expect(result).toBeNull();
      });
    });
  });
});

describe("buildRetryGuidance", () => {
  describe("#given a detected error with Available list in output", () => {
    describe("#when the original output contains Available categories", () => {
      it("#then includes the available options in guidance", () => {
        const guidance = buildRetryGuidance({
          errorType: "unknown_category",
          originalOutput:
            "[ERROR] Unknown category: foo. Available categories: general, quick, visual-engineering",
        });

        expect(guidance).toContain("Available Options");
        expect(guidance).toContain("general, quick, visual-engineering");
      });
    });
  });

  describe("#given a detected error without Available list", () => {
    describe("#when the original output has no Available section", () => {
      it("#then returns guidance without Available Options", () => {
        const guidance = buildRetryGuidance({
          errorType: "missing_run_in_background",
          originalOutput: "[ERROR] run_in_background is required",
        });

        expect(guidance).toContain("missing_run_in_background");
        expect(guidance).toContain("IMMEDIATE RETRY REQUIRED");
        expect(guidance).not.toContain("Available Options");
      });
    });
  });

  describe("#given an unrecognized error type", () => {
    describe("#when errorType is not in DELEGATE_TASK_ERROR_PATTERNS", () => {
      it("#then returns generic fallback guidance", () => {
        const guidance = buildRetryGuidance({
          errorType: "totally_made_up_error",
          originalOutput: "[ERROR] something",
        });

        expect(guidance).toContain("[task ERROR]");
        expect(guidance).toContain("Fix the error");
      });
    });
  });
});
