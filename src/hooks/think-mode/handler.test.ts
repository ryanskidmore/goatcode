import { afterEach, describe, expect, it } from "bun:test";
import {
  clearSessionMode,
  setSessionMode,
} from "../keyword-detector/handler";
import { createThinkModeHandler } from "./handler";

const SESSION_ID = "ses_test";

function makeInput(providerID: string, modelID: string, sessionID: string = SESSION_ID) {
  return {
    sessionID,
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

describe("createThinkModeHandler", () => {
  afterEach(() => {
    clearSessionMode(SESSION_ID);
  });

  describe("#given think mode is active", () => {
    describe("#when called with an Anthropic Claude model", () => {
      it("#then injects thinking with budget_tokens=10000", async () => {
        setSessionMode(SESSION_ID, "think");
        const handler = createThinkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        });
      });
    });

    describe("#when called with google-vertex-anthropic provider", () => {
      it("#then injects thinking parameters", async () => {
        setSessionMode(SESSION_ID, "think");
        const handler = createThinkModeHandler();
        const input = makeInput("google-vertex-anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        });
      });
    });

    describe("#when called with github-copilot claude model", () => {
      it("#then injects thinking parameters", async () => {
        setSessionMode(SESSION_ID, "think");
        const handler = createThinkModeHandler();
        const input = makeInput("github-copilot", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        });
      });
    });

    describe("#when called with a non-Anthropic model", () => {
      it("#then does not inject thinking parameters", async () => {
        setSessionMode(SESSION_ID, "think");
        const handler = createThinkModeHandler();
        const input = makeInput("openai", "gpt-5.4");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toBeUndefined();
      });
    });

    describe("#when thinking is already configured", () => {
      it("#then does not overwrite existing thinking config", async () => {
        setSessionMode(SESSION_ID, "think");
        const handler = createThinkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();
        output.options.thinking = { type: "enabled", budget_tokens: 5000 };

        await handler(input, output);

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 5000,
        });
      });
    });
  });

  describe("#given ultrawork mode is active (not think)", () => {
    describe("#when called with an Anthropic model", () => {
      it("#then does not inject thinking parameters", async () => {
        setSessionMode(SESSION_ID, "ultrawork");
        const handler = createThinkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toBeUndefined();
      });
    });
  });

  describe("#given no session mode is set", () => {
    describe("#when called with an Anthropic model", () => {
      it("#then does not inject thinking parameters", async () => {
        const handler = createThinkModeHandler();
        const input = makeInput("anthropic", "claude-sonnet-4-6");
        const output = makeOutput();

        await handler(input, output);

        expect(output.options.thinking).toBeUndefined();
      });
    });
  });
});
