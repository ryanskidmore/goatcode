import { describe, expect, it } from "bun:test";
import { createCommentCheckerHandler, EMPTY_CATCH_WARNING } from "./handler";

describe("createCommentCheckerHandler", () => {
  describe("#given a handler instance", () => {
    describe("#when output content contains an empty catch block", () => {
      it("#then appends a warning to output.output", async () => {
        const handler = createCommentCheckerHandler();
        const input = { tool: "write", sessionID: "ses_1", callID: "call_1" };
        const output: Record<string, unknown> = {
          content: `function run() {
  try { doWork(); } catch (e) {}
}`,
        };

        await handler(input, output);

        expect(typeof output.output).toBe("string");
        expect(output.output as string).toContain(EMPTY_CATCH_WARNING);
      });
    });

    describe("#when output content is plain text without code", () => {
      it("#then does not inject a warning", async () => {
        const handler = createCommentCheckerHandler();
        const input = { tool: "write", sessionID: "ses_1", callID: "call_1" };
        const output: Record<string, unknown> = {
          content: "This is a plain text readme with no code blocks at all.",
        };

        await handler(input, output);

        expect(output.output).toBeUndefined();
      });
    });

    describe("#when the tool is not write, edit, or multiedit", () => {
      it("#then does nothing", async () => {
        const handler = createCommentCheckerHandler();
        const input = { tool: "bash", sessionID: "ses_1", callID: "call_1" };
        const output: Record<string, unknown> = {
          content: "try { x(); } catch (err) {}",
        };

        await handler(input, output);

        expect(output.output).toBeUndefined();
      });
    });

    describe("#when output has newString with empty catch block", () => {
      it("#then appends a warning via newString extraction", async () => {
        const handler = createCommentCheckerHandler();
        const input = { tool: "edit", sessionID: "ses_1", callID: "call_1" };
        const output: Record<string, unknown> = {
          newString: "try { parse(); } catch (ex) {}",
        };

        await handler(input, output);

        expect(output.output as string).toContain(EMPTY_CATCH_WARNING);
      });
    });
  });
});
