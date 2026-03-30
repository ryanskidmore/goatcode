import { describe, expect, it } from "bun:test";

import { createPostReadNudgeHandler, POST_READ_NUDGE } from "./handler";

describe("createPostReadNudgeHandler", () => {
  describe("#given a Read tool call", () => {
    describe("#when tool.execute.after runs on Read", () => {
      it("#then appends the workflow nudge to the output", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "read", output: "file content here", metadata: {} };

        await handler(input, output);

        expect(output.output.endsWith(POST_READ_NUDGE)).toBe(true);
        expect(output.output).toContain("file content here");
        expect(output.output).toContain("Workflow Reminder");
      });
    });

    describe("#when the Read tool name is lowercase", () => {
      it("#then still appends the nudge due to case-insensitive matching", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "read", output: "some content", metadata: {} };

        await handler(input, output);

        expect(output.output.endsWith(POST_READ_NUDGE)).toBe(true);
      });
    });

    describe("#when the Read tool name is READ in uppercase", () => {
      it("#then still appends the nudge", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "READ", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "read", output: "uppercase read content", metadata: {} };

        await handler(input, output);

        expect(output.output.endsWith(POST_READ_NUDGE)).toBe(true);
      });
    });
  });

  describe("#given a non-Read tool call", () => {
    describe("#when the tool is Bash", () => {
      it("#then leaves the output unchanged", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "Bash", sessionID: "s1", callID: "c1", args: {} };
        const original = "command output";
        const output = { title: "bash", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });

    describe("#when the tool is Edit", () => {
      it("#then leaves the output unchanged", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "Edit", sessionID: "s1", callID: "c1", args: {} };
        const original = "edit successful";
        const output = { title: "edit", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a Read tool output that already contains the nudge", () => {
    describe("#when the output already has the nudge text", () => {
      it("#then does not double-append the nudge", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "read",
          output: `file content${POST_READ_NUDGE}`,
          metadata: {},
        };

        await handler(input, output);

        const nudgeCount = output.output.split("Workflow Reminder").length - 1;
        expect(nudgeCount).toBe(1);
      });
    });
  });

  describe("#given a Read tool with non-string output", () => {
    describe("#when output.output is undefined", () => {
      it("#then does not modify the output", async () => {
        const handler = createPostReadNudgeHandler();
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "read", output: undefined as unknown as string, metadata: {} };

        await handler(input, output);

        expect(output.output).toBeUndefined();
      });
    });
  });

  describe("#given multiple exploration tool calls exceeding threshold", () => {
    describe("#when 3+ exploration calls are made (read, grep, glob mix)", () => {
      it("#then escalates to a delegation nudge on subsequent reads", async () => {
        const handler = createPostReadNudgeHandler();

        // First two reads get normal nudge
        const input1 = { tool: "read", sessionID: "s1", callID: "c1", args: {} };
        const output1 = { title: "read", output: "content1", metadata: {} };
        await handler(input1, output1);
        expect(output1.output).toContain("Workflow Reminder");
        expect(output1.output).not.toContain("DELEGATION NUDGE");

        // Second read
        const input2 = { tool: "read", sessionID: "s1", callID: "c2", args: {} };
        const output2 = { title: "read", output: "content2", metadata: {} };
        await handler(input2, output2);
        expect(output2.output).toContain("Workflow Reminder");
        expect(output2.output).not.toContain("DELEGATION NUDGE");

        // Third read triggers escalation
        const input3 = { tool: "read", sessionID: "s1", callID: "c3", args: {} };
        const output3 = { title: "read", output: "content3", metadata: {} };
        await handler(input3, output3);
        expect(output3.output).toContain("DELEGATION NUDGE");
        expect(output3.output).toContain("delegate to a specialist agent NOW");
      });
    });

    describe("#when grep and glob calls contribute to the count", () => {
      it("#then counts all exploration tools toward the threshold", async () => {
        const handler = createPostReadNudgeHandler();

        // Grep call — doesn't append nudge to grep output
        const grepInput = { tool: "grep", sessionID: "s1", callID: "c1", args: {} };
        const grepOutput = { title: "grep", output: "grep results", metadata: {} };
        await handler(grepInput, grepOutput);
        expect(grepOutput.output).toBe("grep results");

        // Glob call — doesn't append nudge to glob output
        const globInput = { tool: "glob", sessionID: "s1", callID: "c2", args: {} };
        const globOutput = { title: "glob", output: "glob results", metadata: {} };
        await handler(globInput, globOutput);
        expect(globOutput.output).toBe("glob results");

        // Third exploration call is a read — should trigger escalation
        const readInput = { tool: "read", sessionID: "s1", callID: "c3", args: {} };
        const readOutput = { title: "read", output: "file content", metadata: {} };
        await handler(readInput, readOutput);
        expect(readOutput.output).toContain("DELEGATION NUDGE");
      });
    });
  });
});
