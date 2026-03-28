export type EvalCategory = "routing" | "quality" | "safety" | "tool-usage" | "prompt-following"

export interface EvalScenario {
  name: string
  agent: string
  category: EvalCategory
  input: EvalInput
  expected: EvalExpectation
  weight?: number
  tags?: string[]
}

export interface EvalInput {
  userMessage: string
  contextFiles?: string[]
  availableTools?: string[]
  systemPromptOverride?: string
}

export interface EvalExpectation {
  shouldContain?: string[]
  shouldNotContain?: string[]
  shouldMatchPattern?: RegExp[]
  shouldUseTool?: string[]
  shouldNotUseTool?: string[]
  shouldDelegateTo?: string[]
  minResponseLength?: number
  maxResponseLength?: number
  customAssertions?: Array<(result: EvalResult) => boolean>
}

export interface AssertionResult {
  name: string
  passed: boolean
  detail: string
}

export interface EvalResult {
  scenario: EvalScenario
  passed: boolean
  score: number
  duration: number
  assertions: AssertionResult[]
  output?: string
  toolCalls?: string[]
  error?: string
}

export interface AgentReport {
  total: number
  passed: number
  failed: number
  score: number
}

export interface CategoryReport {
  total: number
  passed: number
  failed: number
  score: number
}

export interface EvalReport {
  timestamp: string
  totalScenarios: number
  passed: number
  failed: number
  score: number
  byAgent: Record<string, AgentReport>
  byCategory: Record<string, CategoryReport>
  results: EvalResult[]
}

export type EvalMode = "dry-run" | "live"

export interface EvalRunOptions {
  mode?: EvalMode
  agent?: string
  category?: EvalCategory
  tags?: string[]
  parallel?: boolean
}
