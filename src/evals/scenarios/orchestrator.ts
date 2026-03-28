import type { EvalScenario } from "../types"

export const ORCHESTRATOR_SCENARIOS: EvalScenario[] = [
  {
    name: "orchestrator-delegation-rules",
    agent: "orchestrator",
    category: "routing",
    tags: ["delegation", "routing"],
    input: {
      userMessage: "Route a mixed request to specialist agents with clear ownership.",
    },
    expected: {
      shouldContain: ["# Delegation Rules", "## Agent Routing Table"],
      shouldDelegateTo: ["deep-worker", "plan-builder", "advisor"],
      minResponseLength: 100,
    },
  },
  {
    name: "orchestrator-intent-analysis-framework",
    agent: "orchestrator",
    category: "prompt-following",
    tags: ["classification", "intent"],
    input: {
      userMessage: "Classify user intent before selecting an execution strategy.",
    },
    expected: {
      shouldContain: [
        "# Intent Analysis Framework (Mandatory First Step)",
        "6) **Mixed Intent**",
      ],
      shouldMatchPattern: [/classify the request/i],
    },
  },
  {
    name: "orchestrator-anti-duplication-policy",
    agent: "orchestrator",
    category: "safety",
    tags: ["anti-duplication", "parallel"],
    input: {
      userMessage: "Prevent duplicate codebase exploration after delegation.",
    },
    expected: {
      shouldContain: ["# Anti-Duplication Rules (Strict)", "## Forbidden"],
      shouldMatchPattern: [/do not re-run the same search yourself/i],
      shouldNotContain: ["repeating delegated search is encouraged"],
    },
  },
]
