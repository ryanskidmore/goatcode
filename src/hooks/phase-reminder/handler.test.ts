import { describe, expect, it } from "bun:test";
import type { HookHandler } from "../../types/hook";
import { createPhaseReminderHandler, PHASE_REMINDER } from "./handler";

const createHandler = (): HookHandler => createPhaseReminderHandler() as HookHandler;

describe("createPhaseReminderHandler", () => {
  describe("#given a user message from the orchestrator agent", () => {
    describe("#when the handler processes messages", () => {
      it("#then it prepends the phase reminder to the text", async () => {
        const handler = createHandler();
        const output = {
          messages: [
            {
              info: { role: "user" },
              parts: [{ type: "text", text: "Do the task" }],
            },
          ],
        };

        await handler({}, output);

        expect(output.messages[0].parts[0].text).toContain(PHASE_REMINDER);
        expect(output.messages[0].parts[0].text).toContain("Do the task");
      });
    });
  });

  describe("#given a user message with an explicit orchestrator agent", () => {
    describe("#when the handler processes messages", () => {
      it("#then it prepends the phase reminder", async () => {
        const handler = createHandler();
        const output = {
          messages: [
            {
              info: { role: "user", agent: "orchestrator" },
              parts: [{ type: "text", text: "Plan the work" }],
            },
          ],
        };

        await handler({}, output);

        expect(output.messages[0].parts[0].text).toContain(PHASE_REMINDER);
        expect(output.messages[0].parts[0].text).toContain("Plan the work");
      });
    });
  });

  describe("#given a user message from a non-orchestrator agent", () => {
    describe("#when the handler processes messages", () => {
      it("#then it does not modify the text", async () => {
        const handler = createHandler();
        const output = {
          messages: [
            {
              info: { role: "user", agent: "worker" },
              parts: [{ type: "text", text: "Do the task" }],
            },
          ],
        };

        await handler({}, output);

        expect(output.messages[0].parts[0].text).toBe("Do the task");
      });
    });
  });

  describe("#given a message that already contains the reminder", () => {
    describe("#when the handler processes messages", () => {
      it("#then it does not double-prepend the reminder", async () => {
        const handler = createHandler();
        const existingText = `${PHASE_REMINDER}\n\n---\n\nDo the task`;
        const output = {
          messages: [
            {
              info: { role: "user" },
              parts: [{ type: "text", text: existingText }],
            },
          ],
        };

        await handler({}, output);

        const occurrences =
          output.messages[0].parts[0].text.split("<reminder>Recall Workflow Rules:").length - 1;
        expect(occurrences).toBe(1);
      });
    });
  });

  describe("#given an empty messages array", () => {
    describe("#when the handler processes messages", () => {
      it("#then it is a no-op", async () => {
        const handler = createHandler();
        const output = { messages: [] as unknown[] };

        await handler({}, output);

        expect(output.messages).toEqual([]);
      });
    });
  });
});
