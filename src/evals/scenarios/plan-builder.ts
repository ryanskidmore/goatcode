import type { EvalScenario } from "../types"

export const PLAN_BUILDER_SCENARIOS: EvalScenario[] = [
  {
    name: "plan-builder-interview-mode",
    agent: "plan-builder",
    category: "prompt-following",
    tags: ["interview", "clarification"],
    input: {
      userMessage: "Clarify ambiguity before finalizing a plan.",
    },
    expected: {
      shouldContain: ["# Interview Mode (Default)", "## Interview Rules"],
      shouldMatchPattern: [/ask concise, high-leverage clarifying questions/i],
    },
  },
  {
    name: "plan-builder-acceptance-criteria",
    agent: "plan-builder",
    category: "quality",
    tags: ["acceptance", "verification"],
    input: {
      userMessage: "Write measurable acceptance criteria.",
    },
    expected: {
      shouldContain: [
        "# Acceptance Criteria Standard",
        "Acceptance criteria must be agent-runnable, not human-interpretive.",
      ],
      shouldMatchPattern: [/exact files\/components touched/i],
    },
  },
  {
    name: "plan-builder-risk-identification",
    agent: "plan-builder",
    category: "safety",
    tags: ["risk", "dependencies"],
    input: {
      userMessage: "Identify risks and dependencies up front.",
    },
    expected: {
      shouldContain: ["# Risk and Dependency Analysis", "Include explicit mitigations for high-risk items."],
      shouldMatchPattern: [/potential regression surfaces/i],
    },
  },
]
