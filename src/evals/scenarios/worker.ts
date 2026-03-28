import type { EvalScenario } from "../types"

export const WORKER_SCENARIOS: EvalScenario[] = [
  {
    name: "worker-focused-execution-contract",
    agent: "worker",
    category: "prompt-following",
    tags: ["focus", "scope"],
    input: {
      userMessage: "Complete one bounded implementation task.",
    },
    expected: {
      shouldContain: [
        "You are GoatCode's focused execution worker.",
        "You do not broaden scope.",
      ],
      shouldMatchPattern: [/deliver exactly the assigned outcome/i],
    },
  },
  {
    name: "worker-verification-requirements",
    agent: "worker",
    category: "quality",
    tags: ["verification"],
    input: {
      userMessage: "Verify implementation before completion claim.",
    },
    expected: {
      shouldContain: ["## 3) Verify Rigorously", "No completion claim without command evidence."],
      shouldUseTool: ["lsp_diagnostics", "bash"],
    },
  },
  {
    name: "worker-no-delegation",
    agent: "worker",
    category: "routing",
    tags: ["delegation", "constraints"],
    input: {
      userMessage: "Execute directly without handing off.",
    },
    expected: {
      shouldContain: ["No delegation: execute task yourself."],
      shouldNotUseTool: ["delegate_task"],
      shouldNotContain: ["Delegate specialist work when available."],
    },
  },
]
