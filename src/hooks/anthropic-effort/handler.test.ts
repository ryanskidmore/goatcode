import { describe, expect, it } from "bun:test";
import { createAnthropicEffortHandler } from "./handler";

function makeInput(providerID: string, modelID: string) {
  return {
    sessionID: "ses_test",
    agent: "sisyphus",
    model: { providerID, modelID },
    provider: { id: providerID },
    message: {},
  };
}

function makeOutput() {
  return {
    temperature: 0.1,
    topP: 1,
    topK: 0,
    options: {} as Record<string, unknown>,
  };
}

describe("createAnthropicEffortHandler", () => {
  describe("#given effort level 'medium' and Anthropic model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking with budget_tokens=5000", async () => {
        const handler = createAnthropicEffortHandler("medium");
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 5000,
        });
      });
    });
  });

  describe("#given effort level 'high' and Anthropic model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking with budget_tokens=10000", async () => {
        const handler = createAnthropicEffortHandler("high");
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        });
      });
    });
  });

  describe("#given effort level 'max' and Anthropic sonnet model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking with budget_tokens=32000 but no effort flag", async () => {
        const handler = createAnthropicEffortHandler("max");
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 32000,
        });
        expect(output.options.effort).toBeUndefined();
      });
    });
  });

  describe("#given effort level 'max' and Anthropic opus model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking and sets effort='max'", async () => {
        const handler = createAnthropicEffortHandler("max");
        const input = makeInput("anthropic", "claude-opus-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 32000,
        });
        expect(output.options.effort).toBe("max");
      });
    });
  });

  describe("#given effort level 'low'", () => {
    describe("#when chat.params hook is called", () => {
      it("#then does not inject any parameters", async () => {
        const handler = createAnthropicEffortHandler("low");
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toBeUndefined();
      });
    });
  });

  describe("#given default effort level (no argument)", () => {
    describe("#when chat.params hook is called with Anthropic model", () => {
      it("#then defaults to 'high' with budget_tokens=10000", async () => {
        const handler = createAnthropicEffortHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        });
      });
    });
  });

  describe("#given a non-Anthropic model", () => {
    describe("#when chat.params hook is called with effort 'high'", () => {
      it("#then does not inject any parameters", async () => {
        const handler = createAnthropicEffortHandler("high");
        const input = makeInput("openai", "gpt-5.4");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toBeUndefined();
      });
    });
  });

  describe("#given thinking is already configured", () => {
    describe("#when chat.params hook is called with effort 'high'", () => {
      it("#then does not overwrite existing thinking config", async () => {
        const handler = createAnthropicEffortHandler("high");
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();
        output.options.thinking = { type: "enabled", budget_tokens: 999 };

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 999,
        });
      });
    });
  });
});
