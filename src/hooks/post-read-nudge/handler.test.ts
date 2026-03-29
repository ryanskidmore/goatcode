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
});
