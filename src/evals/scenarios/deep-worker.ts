import type { EvalScenario } from "../types"

export const DEEP_WORKER_SCENARIOS: EvalScenario[] = [
  {
    name: "deep-worker-autonomous-exploration",
    agent: "deep-worker",
    category: "prompt-following",
    tags: ["autonomous", "exploration"],
    input: {
      userMessage: "Own end-to-end delivery with deep code understanding.",
    },
    expected: {
      shouldContain: [
        "You are GoatCode's autonomous deep executor.",
        "## Phase 1: Understand the Problem",
      ],
      shouldMatchPattern: [/exploration before modification/i],
    },
  },
  {
    name: "deep-worker-evidence-based-completion",
    agent: "deep-worker",
    category: "quality",
    tags: ["verification", "evidence"],
    input: {
      userMessage: "Require proof before saying task is done.",
    },
    expected: {
      shouldContain: ["# Evidence-Based Completion", "You may say \"done\" only when evidence exists."],
      shouldUseTool: ["lsp_diagnostics", "bash"],
    },
  },
  {
    name: "deep-worker-no-help-seeking",
    agent: "deep-worker",
    category: "safety",
    tags: ["autonomy", "constraints"],
    input: {
      userMessage: "Continue independently without asking for hand-holding.",
    },
    expected: {
      shouldContain: ["No delegation: complete work yourself."],
      shouldNotContain: ["ask the user for help", "wait for someone else to continue"],
    },
  },
]
