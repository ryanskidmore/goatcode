import type { EvalScenario } from "../types"

export const EXPLORER_SCENARIOS: EvalScenario[] = [
  {
    name: "explorer-parallel-search-mandate",
    agent: "explorer",
    category: "tool-usage",
    tags: ["parallel", "search"],
    input: {
      userMessage: "Find the best place to implement a feature quickly.",
    },
    expected: {
      shouldContain: ["## 2) Parallel Search First Action", "3+ parallel tool calls"],
      shouldMatchPattern: [/do not perform slow serial search/i],
    },
  },
  {
    name: "explorer-structured-results-contract",
    agent: "explorer",
    category: "quality",
    tags: ["output", "format"],
    input: {
      userMessage: "Return concrete findings with file locations.",
    },
    expected: {
      shouldContain: ["## files_found", "## direct_answer", "## next_steps"],
      shouldMatchPattern: [/absolute paths/i],
    },
  },
  {
    name: "explorer-no-delegation-language",
    agent: "explorer",
    category: "routing",
    tags: ["constraints", "delegation"],
    input: {
      userMessage: "Investigate code without handing off work.",
    },
    expected: {
      shouldContain: ["You are read-only."],
      shouldNotContain: ["Delegate specialist work when available."],
      shouldNotUseTool: ["delegate_task"],
    },
  },
]
