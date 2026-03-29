import { describe, expect, it } from "bun:test";

import { EDIT_ERROR_RECOVERY_MESSAGE } from "./edit-error/handler";
import { composeHooks } from "./hook-composer";
import { withPriority } from "./hook-ordering";
import { HOOK_TIERS, type HookTier } from "./hook-types";
import {
  clearSessionMode,
  createKeywordDetectorHandler,
} from "./keyword-detector/handler";
import { createThinkModeHandler } from "./think-mode/handler";
import { aggregateHooks } from "../registry/hook-aggregator";
import type { PluginDefinition, PluginHookHandler } from "../types/plugin";

const TIER_PRIORITIES: Record<HookTier, number> = {
  config: 0,
  message: 10,
  transform: 20,
  event: 30,
  tool: 40,
};

function getTierPriority(eventName: string): number {
  const tier = HOOK_TIERS[eventName as keyof typeof HOOK_TIERS];
  return tier ? TIER_PRIORITIES[tier] : 100;
}

async function runAggregatedHooksByTier(
  hookMap: Map<string, PluginHookHandler[]>,
  ioByEvent: Record<string, { input: unknown; output: unknown }>,
): Promise<void> {
  const orderedEvents = [...hookMap.entries()].sort(
    ([eventA], [eventB]) => getTierPriority(eventA) - getTierPriority(eventB),
  );

  for (const [eventName, handlers] of orderedEvents) {
    const composed = composeHooks(eventName, handlers);
    const io = ioByEvent[eventName] ?? { input: {}, output: {} };
    await composed(io.input, io.output);
  }
}

describe("hook composition integration", () => {
  describe("#given hooks across config/message/tool tiers", () => {
    describe("#when hooks are aggregated and executed by tier priority", () => {
      it("#then config fires before message, and message before tool", async () => {
        const calls: string[] = [];

        const plugins: PluginDefinition[] = [
          {
            name: "config-plugin",
            hooks: {
              config: async () => {
                calls.push("config");
              },
            },
          },
          {
            name: "message-plugin",
            hooks: {
              "chat.message": async () => {
                calls.push("message");
              },
            },
          },
          {
            name: "tool-plugin",
            hooks: {
              "tool.execute.before": async () => {
                calls.push("tool");
              },
            },
          },
        ];

        const aggregated = aggregateHooks(plugins);
        await runAggregatedHooksByTier(aggregated, {
          config: { input: {}, output: {} },
          "chat.message": { input: {}, output: {} },
          "tool.execute.before": { input: {}, output: {} },
        });

        expect(calls).toEqual(["config", "message", "tool"]);
      });
    });
  });

  describe("#given two handlers in the same tier and event", () => {
    describe("#when one handler has lower explicit priority", () => {
      it("#then the lower-priority-number handler fires first", async () => {
        const calls: string[] = [];

        const earlyHandler = withPriority(async () => {
          calls.push("early");
        }, -1);

        const aggregated = aggregateHooks([
          {
            name: "normal-message-plugin",
            hooks: {
              "chat.message": async () => {
                calls.push("normal");
              },
            },
          },
          {
            name: "early-message-plugin",
            hooks: { "chat.message": earlyHandler },
          },
        ]);

        const handlers = aggregated.get("chat.message") ?? [];
        const composed = composeHooks("chat.message", handlers);

        await composed({}, {});

        expect(calls).toEqual(["early", "normal"]);
      });
    });
  });

  describe("#given multiple hooks mutating the same output field", () => {
    describe("#when both handlers append to output.output", () => {
      it("#then both mutations are accumulated in sequence", async () => {
        const plugins: PluginDefinition[] = [
          {
            name: "append-a",
            hooks: {
              "tool.execute.after": async (_input, output) => {
                if (typeof output === "object" && output !== null && "output" in output) {
                  const current = output.output;
                  if (typeof current === "string") {
                    output.output = `${current}\n[A]`;
                  }
                }
              },
            },
          },
          {
            name: "append-b",
            hooks: {
              "tool.execute.after": async (_input, output) => {
                if (typeof output === "object" && output !== null && "output" in output) {
                  const current = output.output;
                  if (typeof current === "string") {
                    output.output = `${current}\n[B]`;
                  }
                }
              },
            },
          },
        ];

        const aggregated = aggregateHooks(plugins);
        const handlers = aggregated.get("tool.execute.after") ?? [];
        const composed = composeHooks("tool.execute.after", handlers);

        const input = { tool: "bash", sessionID: "ses_accumulate", callID: "call_accumulate", args: {} };
        const output = { output: "base", title: "tool execution", metadata: {} };
        await composed(input, output);

        expect(output.output).toBe("base\n[A]\n[B]");
      });
    });
  });

  describe("#given keyword-detector and think-mode handlers", () => {
    describe("#when a message enables think mode for a session", () => {
      it("#then chat.params composition reads shared session state and injects thinking", async () => {
        const sessionID = "ses_hook_chain";
        clearSessionMode(sessionID);

        const keywordHandler = createKeywordDetectorHandler();
        const thinkModeHandler = createThinkModeHandler();

        const messageInput = { sessionID };
        const messageOutput = {
          message: {},
          parts: [{ type: "text", text: "Please deep-think this architecture change." }],
        };

        await keywordHandler(messageInput, messageOutput);

        const paramsInput = {
          sessionID,
          agent: "sisyphus",
          model: {
            providerID: "anthropic",
            modelID: "claude-3-7-sonnet",
          },
          provider: { id: "anthropic" },
          message: {},
        };
        const paramsOutput = {
          temperature: 0.1,
          topP: 1,
          topK: 0,
          options: {},
        };

        await thinkModeHandler(paramsInput, paramsOutput);

        expect(paramsOutput.options).toEqual({
          thinking: {
            type: "enabled",
            budget_tokens: 10000,
          },
        });

        clearSessionMode(sessionID);
      });
    });
  });

  describe("#given two hooks that both append guidance to tool output", () => {
    describe("#when composed handlers run on an edit failure payload", () => {
      it("#then truncation notice and edit recovery guidance are both preserved", async () => {
        const plugins: PluginDefinition[] = [
          {
            name: "tool-output-truncator-like",
            hooks: {
              "tool.execute.after": async (_input, output) => {
                if (typeof output === "object" && output !== null && "output" in output) {
                  const current = output.output;
                  if (typeof current === "string") {
                    output.output = `${current}\n[Output truncated: synthetic notice for integration test.]`;
                  }
                }
              },
            },
          },
          {
            name: "edit-error-like",
            hooks: {
              "tool.execute.after": async (_input, output) => {
                if (typeof output === "object" && output !== null && "output" in output) {
                  const current = output.output;
                  if (typeof current === "string" && /oldstring not found/i.test(current)) {
                    output.output = `${current}\n${EDIT_ERROR_RECOVERY_MESSAGE}`;
                  }
                }
              },
            },
          },
        ];

        const handlers = aggregateHooks(plugins).get("tool.execute.after") ?? [];
        const composed = composeHooks("tool.execute.after", handlers);

        const input = { tool: "edit", sessionID: "ses_dual_mutation", callID: "call_dual_mutation", args: {} };
        const output = {
          output: "oldString not found while applying patch",
          title: "tool execution",
          metadata: {},
        };

        await composed(input, output);

        expect(typeof output.output).toBe("string");
        expect(output.output).toContain("[Output truncated: synthetic notice for integration test.]");
        expect(output.output).toContain(EDIT_ERROR_RECOVERY_MESSAGE);
      });
    });
  });
});
