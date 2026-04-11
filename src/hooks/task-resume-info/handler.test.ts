import { describe, expect, it } from "bun:test";

import { createTaskResumeInfoHandler } from "./handler";

describe("createTaskResumeInfoHandler", () => {
  describe("#given a task tool output with Session ID pattern", () => {
    describe("#when the output contains Session ID: ses_xxx", () => {
      it("#then appends a continuation hint with the session ID", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "Work completed.\nSession ID: ses_test123",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain('task(session_id="ses_test123"');
        expect(output.output).toContain("to continue:");
      });
    });
  });

  describe("#given a task tool output with session_id lowercase pattern", () => {
    describe("#when the output uses session_id: ses_xxx", () => {
      it("#then extracts the session ID and appends continuation", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "Done.\nsession_id: ses_lower456",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("ses_lower456");
        expect(output.output).toContain("to continue:");
      });
    });
  });

  describe("#given a task tool output with task_metadata XML pattern", () => {
    describe("#when the output uses <task_metadata> with session_id", () => {
      it("#then extracts the session ID from the XML-like format", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "<task_metadata>\nsession_id: ses_meta789\n</task_metadata>",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("ses_meta789");
        expect(output.output).toContain("to continue:");
      });
    });
  });

  describe("#given a task tool output with sessionId camelCase pattern", () => {
    describe("#when the output uses sessionId: ses_xxx", () => {
      it("#then extracts the session ID from camelCase format", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output: "Result:\nsessionId: ses_camel321",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("ses_camel321");
        expect(output.output).toContain("to continue:");
      });
    });
  });

  describe("#given a task tool output without any session ID", () => {
    describe("#when the output has no session ID pattern", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const original = "Task completed with no session info.";
        const output = { title: "task", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a task tool output that already has continuation info", () => {
    describe("#when the output already contains a to continue line", () => {
      it("#then does not add a duplicate", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "task",
          output:
            'Done.\nSession ID: ses_dup\nto continue: task(session_id="ses_dup", prompt="...")',
          metadata: {},
        };

        await handler(input, output);

        const matches = output.output.match(/to continue:/g);
        expect(matches?.length).toBe(1);
        expect(output.metadata).toEqual(
          expect.objectContaining({
            sessionId: "ses_dup",
            session_id: "ses_dup",
          }),
        );
      });
    });
  });

  describe("#given completed task output with session and category/subagent lines", () => {
    describe("#when metadata is missing or partial", () => {
      it("#then backfills metadata fields needed for completed card navigation", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = {
          tool: "task",
          sessionID: "s1",
          callID: "c1",
          args: {
            category: "deep",
            description: "Long-running clickability test delegation",
            subagent_type: "deepworker",
          },
        };
        const output = {
          title: "task",
          output:
            "Background task launched.\nCategory: deep\nAgent: deepworker (subagent)\nSession ID: ses_fill123\n<task_metadata>\nsession_id: ses_fill123\nsubagent: deepworker\n</task_metadata>",
          metadata: {},
        };

        await handler(input, output);

        expect(output.metadata).toEqual(
          expect.objectContaining({
            sessionId: "ses_fill123",
            session_id: "ses_fill123",
            category: "deep",
            subagent_type: "deepworker",
            description: "Long-running clickability test delegation",
          }),
        );
      });
    });
  });

  describe("#given task output with Session header but no task metadata block", () => {
    it("#then still injects continuation using extracted session id", async () => {
      const handler = createTaskResumeInfoHandler();
      const input = {
        tool: "task",
        sessionID: "s1",
        callID: "c1",
        args: {
          category: "quick",
          description: "header session test",
          subagent_type: "worker",
        },
      };
      const output = {
        title: "task",
        output: "Task timed out after 60s. Session: ses_header_777",
        metadata: {},
      };

      await handler(input, output);

      expect(output.output).toContain('to continue: task(session_id="ses_header_777"');
      expect(output.metadata).toEqual(
        expect.objectContaining({
          sessionId: "ses_header_777",
          session_id: "ses_header_777",
        }),
      );
    });
  });

  describe("#given running task output missing explicit status line", () => {
    describe("#when session metadata can be extracted", () => {
      it("#then injects a running status line before continuation hint", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = {
          tool: "task",
          sessionID: "s1",
          callID: "c1",
          args: {
            category: "quick",
            description: "status test",
            subagent_type: "worker",
          },
        };
        const output = {
          title: "task",
          output:
            "Background task launched.\n\nTask ID: task_status1\nCategory: quick\nDescription: status test\nSession ID: ses_status1\n<task_metadata>\nsession_id: ses_status1\ntask_id: task_status1\nsubagent: worker\n</task_metadata>",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("Status: running (task_status1)");
        expect(output.output).toContain('to continue: task(session_id="ses_status1"');
      });
    });
  });

  describe("#given a task tool output starting with Error:", () => {
    describe("#when the output is an error even with a session ID", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const original = "Error: something failed. Session ID: ses_err1";
        const output = { title: "task", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a task tool output starting with Failed", () => {
    describe("#when the output indicates a failure", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const original = "Failed to execute. Session ID: ses_fail1";
        const output = { title: "task", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a non-target tool", () => {
    describe("#when the tool is Read with a session ID in output", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} };
        const original = "Session ID: ses_readtool";
        const output = { title: "Read", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a call_omo_agent tool with a session ID", () => {
    describe("#when the tool is in the TARGET_TOOLS list", () => {
      it("#then appends the continuation hint", async () => {
        const handler = createTaskResumeInfoHandler();
        const input = { tool: "call_omo_agent", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "call_omo_agent",
          output: "Agent done.\nSession ID: ses_omo999",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("ses_omo999");
        expect(output.output).toContain("to continue:");
      });
    });
  });
});
