import { describe, expect, it } from "bun:test";
import { createThinkingBlockValidatorHandler } from "./handler";

describe("createThinkingBlockValidatorHandler", () => {
  describe("#given a handler instance", () => {
    describe("#when messages contain a malformed thinking block", () => {
      it("#then strips the malformed thinking part", async () => {
        const handler = createThinkingBlockValidatorHandler();
        const messages = [
          {
            info: { role: "assistant", id: "msg_1" },
            parts: [
              { type: "thinking", thinking: "" },
              { type: "text", text: "Hello world" },
            ],
          },
        ];
        const output = { messages };

        await handler({}, output);

        expect(messages[0].parts).toHaveLength(1);
        expect(messages[0].parts[0].type).toBe("text");
        expect(messages[0].parts[0].text).toBe("Hello world");
      });
    });

    describe("#when messages contain a valid thinking block", () => {
      it("#then preserves the thinking part unchanged", async () => {
        const handler = createThinkingBlockValidatorHandler();
        const messages = [
          {
            info: { role: "assistant", id: "msg_1" },
            parts: [
              { type: "thinking", thinking: "Let me reason through this problem." },
              { type: "text", text: "The answer is 42." },
            ],
          },
        ];
        const output = { messages };

        await handler({}, output);

        expect(messages[0].parts).toHaveLength(2);
        expect(messages[0].parts[0].type).toBe("thinking");
        expect(messages[0].parts[0].thinking).toBe("Let me reason through this problem.");
      });
    });

    describe("#when messages array is empty", () => {
      it("#then does nothing and does not throw", async () => {
        const handler = createThinkingBlockValidatorHandler();

        await expect(handler({}, { messages: [] })).resolves.toBeUndefined();
      });
    });

    describe("#when a reasoning part has whitespace-only content", () => {
      it("#then strips the whitespace-only reasoning part", async () => {
        const handler = createThinkingBlockValidatorHandler();
        const messages = [
          {
            info: { role: "assistant", id: "msg_2" },
            parts: [
              { type: "reasoning", text: "   \n\t  " },
              { type: "text", text: "Result" },
            ],
          },
        ];
        const output = { messages };

        await handler({}, output);

        expect(messages[0].parts).toHaveLength(1);
        expect(messages[0].parts[0].type).toBe("text");
      });
    });
  });
});
