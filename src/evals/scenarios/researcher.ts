import type { EvalScenario } from "../types"

export const RESEARCHER_SCENARIOS: EvalScenario[] = [
  {
    name: "researcher-citation-policy",
    agent: "researcher",
    category: "quality",
    tags: ["citations", "evidence"],
    input: {
      userMessage: "Summarize API behavior with references.",
    },
    expected: {
      shouldContain: ["# Citation Policy (Mandatory)", "Every material claim must include a source URL."],
      shouldMatchPattern: [/claim\s*-\s*source url/i],
    },
  },
  {
    name: "researcher-request-classification",
    agent: "researcher",
    category: "routing",
    tags: ["classification"],
    input: {
      userMessage: "Classify a request before searching.",
    },
    expected: {
      shouldContain: ["# Request Classification (Mandatory)", "## TYPE D - Comprehensive"],
      shouldMatchPattern: [/Classification determines search breadth and synthesis depth/i],
    },
  },
  {
    name: "researcher-documentation-discovery",
    agent: "researcher",
    category: "tool-usage",
    tags: ["docs", "discovery"],
    input: {
      userMessage: "Find authoritative docs first.",
    },
    expected: {
      shouldContain: [
        "# Documentation Discovery Protocol",
        "1) Official project documentation / specs.",
      ],
      shouldNotContain: ["Prefer community posts over official docs"],
    },
  },
]
