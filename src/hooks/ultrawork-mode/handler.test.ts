import { afterEach, describe, expect, it } from "bun:test";
import { clearSessionMode, setSessionMode } from "../keyword-detector/handler";
import { createUltraworkModeHandler } from "./handler";

const SESSION_ID = "ses_test";

function makeInput(providerID: string, modelID: string, sessionID: string = SESSION_ID) {
  return {
    sessionID,
    agent: "orchestrator",
    model: { providerID, modelID },
    provider: { id: providerID },
    message: {},
  };
}

function makeOutput(withSystem: boolean = true) {
  return {
    temperature: 0.1,
    topP: 1,
    topK: 0,
    options: {} as Record<string, unknown>,
    ...(withSystem ? { system: "base-system" } : {}),
  };
}

async function invokeHandler(
  handler: ReturnType<typeof createUltraworkModeHandler>,
  input: ReturnType<typeof makeInput>,
  output: ReturnType<typeof makeOutput> | { options: Record<string, unknown>; prompt: string },
) {
  await handler(
    input as unknown as Parameters<ReturnType<typeof createUltraworkModeHandler>>[0],
    output as unknown as Parameters<ReturnType<typeof createUltraworkModeHandler>>[1],
  );
}

describe("createUltraworkModeHandler", () => {
  afterEach(() => {
    clearSessionMode(SESSION_ID);
  });

  describe("#given ultrawork mode is active", () => {
    describe("#when called with an Anthropic Claude model", () => {
      it("#then injects thinking and ultrawork system context", async () => {
        setSessionMode(SESSION_ID, "ultrawork");
        const handler = createUltraworkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await invokeHandler(handler, input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        });
        expect(output.system).toContain("<ultrawork-mode>");
        expect(output.system).toContain("DELEGATION-FIRST EXECUTION");
      });
    });

    describe("#when thinking is already configured", () => {
      it("#then does not overwrite existing thinking config", async () => {
        setSessionMode(SESSION_ID, "ultrawork");
        const handler = createUltraworkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();
        output.options.thinking = { type: "enabled", budget_tokens: 5000 };

        await invokeHandler(handler, input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 5000,
        });
        expect(output.system).toContain("<ultrawork-mode>");
      });
    });

    describe("#when system already contains ultrawork-mode context", () => {
      it("#then avoids injecting duplicate ultrawork block", async () => {
        setSessionMode(SESSION_ID, "ultrawork");
        const handler = createUltraworkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();
        output.system = "base-system\n\n<ultrawork-mode>existing</ultrawork-mode>";

        await invokeHandler(handler, input, output);

        const ultraworkTagCount = (output.system.match(/<ultrawork-mode>/g) ?? []).length;
        expect(ultraworkTagCount).toBe(1);
      });
    });

    describe("#when no system field exists but prompt field exists", () => {
      it("#then injects ultrawork context into prompt", async () => {
        setSessionMode(SESSION_ID, "ultrawork");
        const handler = createUltraworkModeHandler();
        const input = makeInput("openai", "gpt-5.4");
        const output = {
          options: {} as Record<string, unknown>,
          prompt: "base-prompt",
        };

        await invokeHandler(handler, input, output);

        expect(output.options.thinking).toBeUndefined();
        expect(output.prompt).toContain("<ultrawork-mode>");
      });
    });

    describe("#when called with non-Anthropic model", () => {
      it("#then skips thinking injection but still injects ultrawork context", async () => {
        setSessionMode(SESSION_ID, "ultrawork");
        const handler = createUltraworkModeHandler();
        const input = makeInput("openai", "gpt-5.4");
        const output = makeOutput();

        await invokeHandler(handler, input, output);

        expect(output.options.thinking).toBeUndefined();
        expect(output.system).toContain("<ultrawork-mode>");
      });
    });
  });

  describe("#given think mode is active (not ultrawork)", () => {
    it("#then does not inject ultrawork settings", async () => {
      setSessionMode(SESSION_ID, "think");
      const handler = createUltraworkModeHandler();
      const input = makeInput("anthropic", "claude-sonnet-4-6");
      const output = makeOutput();

      await invokeHandler(handler, input, output);

      expect(output.options.thinking).toBeUndefined();
      expect(output.system).toBe("base-system");
    });
  });

  describe("#given no session mode is set", () => {
    it("#then does not inject ultrawork settings", async () => {
      const handler = createUltraworkModeHandler();
      const input = makeInput("anthropic", "claude-sonnet-4-6");
      const output = makeOutput();

      await invokeHandler(handler, input, output);

      expect(output.options.thinking).toBeUndefined();
      expect(output.system).toBe("base-system");
    });
  });
});
