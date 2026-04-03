import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";
import { getSessionMode } from "../keyword-detector/handler";

const THINK_BUDGET_TOKENS = 10000;

const ULTRAWORK_SYSTEM_CONTEXT = `<ultrawork-mode>

[CODE RED] Maximum precision required. Ultrathink before acting.

## ABSOLUTE CERTAINTY REQUIRED

YOU MUST NOT START ANY IMPLEMENTATION UNTIL YOU ARE 100% CERTAIN.

| BEFORE YOU WRITE A SINGLE LINE OF CODE, YOU MUST: |
|----------------------------------------------------|
| FULLY UNDERSTAND what the user ACTUALLY wants (not what you ASSUME) |
| EXPLORE the codebase to understand existing patterns and architecture |
| HAVE A CRYSTAL CLEAR WORK PLAN - vague plans produce failed work |
| RESOLVE ALL AMBIGUITY - if ANYTHING is unclear, ASK or INVESTIGATE |

IF YOU ARE NOT 100% CERTAIN:
1. THINK DEEPLY - What is the user's TRUE intent?
2. EXPLORE THOROUGHLY - Fire exploration agents to gather ALL relevant context
3. CONSULT SPECIALISTS - Delegate to the right category (ultrabrain for hard logic, artistry for creative problems, deep for autonomous work)
4. ASK THE USER - If ambiguity remains after exploration, ASK. Don't guess.

## NO EXCUSES. DELIVER WHAT WAS ASKED.

| VIOLATION | CONSEQUENCE |
|-----------|-------------|
| "I couldn't because..." | UNACCEPTABLE. Find a way or ask for help. |
| "This is a simplified version..." | UNACCEPTABLE. Deliver the FULL implementation. |
| "You can extend this later..." | UNACCEPTABLE. Finish it NOW. |
| "Due to limitations..." | UNACCEPTABLE. Use agents, tools, whatever it takes. |
| "I made some assumptions..." | UNACCEPTABLE. You should have asked FIRST. |

## DELEGATION-FIRST EXECUTION

DEFAULT BEHAVIOR: DELEGATE. DO NOT WORK YOURSELF.

| Task Type | Action |
|-----------|--------|
| Codebase exploration | task(category="deep", run_in_background=true) |
| Hard problem (conventional) | task(category="ultrabrain") |
| Hard problem (creative) | task(category="artistry") |
| Quick fixes | task(category="quick") |
| Implementation | task(category="...", run_in_background=true) |

YOU SHOULD ONLY DO IT YOURSELF WHEN:
- Task is trivially simple (1-2 lines, obvious change)
- You have ALL context already loaded
- Delegation overhead exceeds task complexity

OTHERWISE: DELEGATE. ALWAYS.

## EXECUTION RULES
- TODO: Track EVERY step. Mark complete IMMEDIATELY after each.
- PARALLEL: Fire independent agent calls simultaneously - NEVER wait sequentially.
- BACKGROUND FIRST: Use task(run_in_background=true) for exploration/research (10+ concurrent if needed).
- VERIFY: Re-read request after completion. Check ALL requirements met before reporting done.

## WORKFLOW
1. Analyze the request and identify required capabilities
2. Spawn exploration agents in PARALLEL (10+ if needed)
3. Use gathered context to create detailed work breakdown
4. Execute with continuous verification against original requirements

## VERIFICATION GUARANTEE

NOTHING is "done" without PROOF it works.

| Phase | Required Evidence |
|-------|-------------------|
| Build | Exit code 0, no errors |
| Test | All tests pass |
| Manual Verify | Demonstrate it works |
| Regression | Existing tests still pass |

WITHOUT evidence = NOT verified = NOT done.

## ZERO TOLERANCE FAILURES
- NO Scope Reduction: deliver FULL implementation, never "demo" or "skeleton" versions
- NO Partial Completion: finish 100%, never stop at 60-80%
- NO Assumed Shortcuts: never skip requirements you deem "optional"
- NO Premature Stopping: never declare done until ALL TODOs completed and verified
- NO TEST DELETION: fix the code, not the tests

EXPLORE -> GATHER -> PLAN -> DELEGATE -> VERIFY. NOW.

</ultrawork-mode>`;

type ChatParamsHook = NonNullable<PluginHookContributions["chat.params"]>;

type ParamsOutput = {
  options?: Record<string, unknown>;
  system?: string;
  prompt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnthropicClaude(providerID: string, modelID: string): boolean {
  const claudeProviders = ["anthropic", "google-vertex-anthropic", "opencode"];
  if (claudeProviders.includes(providerID)) return true;
  if (providerID === "github-copilot" && modelID.toLowerCase().includes("claude")) return true;
  return false;
}

function injectUltraworkSystemContext(output: ParamsOutput): boolean {
  const taggedContext = `\n\n${ULTRAWORK_SYSTEM_CONTEXT}`;

  if (typeof output.system === "string") {
    if (output.system.includes("<ultrawork-mode>")) return false;
    output.system += taggedContext;
    return true;
  }

  if (typeof output.prompt === "string") {
    if (output.prompt.includes("<ultrawork-mode>")) return false;
    output.prompt += taggedContext;
    return true;
  }

  return false;
}

export function createUltraworkModeHandler(): ChatParamsHook {
  return async (input: unknown, output: unknown): Promise<void> => {
    if (!isRecord(input) || !isRecord(output)) return;

    const sessionID = input.sessionID;
    if (typeof sessionID !== "string") return;

    if (getSessionMode(sessionID) !== "ultrawork") return;

    const model = input.model;
    if (!isRecord(model)) return;
    if (typeof model.providerID !== "string" || typeof model.modelID !== "string") return;

    const typedOutput = output as ParamsOutput;
    const options = typedOutput.options;

    let injectedThinking = false;
    if (isAnthropicClaude(model.providerID, model.modelID) && isRecord(options)) {
      if (options.thinking === undefined) {
        options.thinking = {
          type: "enabled",
          budget_tokens: THINK_BUDGET_TOKENS,
        };
        injectedThinking = true;
      }
    }

    const injectedContext = injectUltraworkSystemContext(typedOutput);

    if (injectedThinking || injectedContext) {
      log("[ultrawork-mode] ultrawork parameters injected", {
        sessionID,
        injectedThinking,
        injectedContext,
        budget_tokens: injectedThinking ? THINK_BUDGET_TOKENS : undefined,
      });
    }
  };
}
