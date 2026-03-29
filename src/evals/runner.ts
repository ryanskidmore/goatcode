import { ADVISOR_PROMPT } from "../agents/advisor/prompt"
import { DEEP_WORKER_PROMPT } from "../agents/deep-worker/prompt"
import { EXPLORER_PROMPT } from "../agents/explorer/prompt"
import { ORCHESTRATOR_PROMPT } from "../agents/orchestrator/prompt"
import { PLAN_BUILDER_PROMPT } from "../agents/plan-builder/prompt"
import { RESEARCHER_PROMPT } from "../agents/researcher/prompt"
import { buildToolsMap, getToolRestrictions } from "../agents/tool-restrictions"
import { WORKER_PROMPT } from "../agents/worker/prompt"
import {
  containsText,
  hasMaxLength,
  hasMinLength,
  matchesPattern,
  mentionsTools,
  notContainsText,
} from "./assertions"
import type {
  AssertionResult,
  EvalReport,
  EvalResult,
  EvalRunOptions,
  EvalScenario,
} from "./types"

const AGENT_PROMPTS: Record<string, string> = {
  orchestrator: ORCHESTRATOR_PROMPT,
  explorer: EXPLORER_PROMPT,
  advisor: ADVISOR_PROMPT,
  researcher: RESEARCHER_PROMPT,
  worker: WORKER_PROMPT,
  "deep-worker": DEEP_WORKER_PROMPT,
  "plan-builder": PLAN_BUILDER_PROMPT,
}

function normalizeToolName(tool: string): string {
  return tool.trim().toLowerCase()
}

function toolMentionTokens(tool: string): string[] {
  const normalized = normalizeToolName(tool)
  const aliases: Record<string, string[]> = {
    lsp_diagnostics: ["lsp_diagnostics", "diagnostics"],
    delegate_task: ["delegate_task"],
  }
  return aliases[normalized] ?? [normalized]
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function mentionsToolByAlias(output: string, tool: string): AssertionResult {
  const tokens = toolMentionTokens(tool)
  const passed = tokens.some((token) => mentionsTools(output, [token]).passed)
  return {
    name: "mentionsToolAlias",
    passed,
    detail: passed
      ? `Tool mentioned via aliases: ${tokens.join(", ")}`
      : `Missing tool aliases: ${tokens.join(", ")}`,
  }
}

function buildAgentToolEvidence(agent: string, tool: string, output: string): AssertionResult {
  const normalizedTool = normalizeToolName(tool)
  const toolsMap = buildToolsMap(agent)
  const restrictions = getToolRestrictions(agent)
  const mentionCheck = mentionsToolByAlias(output, normalizedTool)

  if (restrictions.denied?.includes(normalizedTool)) {
    return {
      name: "shouldUseTool",
      passed: false,
      detail: `Tool denied by restriction for ${agent}: ${normalizedTool}`,
    }
  }

  if (toolsMap && normalizedTool in toolsMap) {
    const allowed = toolsMap[normalizedTool] === true
    return {
      name: "shouldUseTool",
      passed: allowed && mentionCheck.passed,
      detail: allowed
        ? mentionCheck.passed
          ? `Tool allowed and mentioned for ${agent}: ${normalizedTool}`
          : `Tool allowed but not mentioned in prompt for ${agent}: ${normalizedTool}`
        : `Tool explicitly disallowed for ${agent}: ${normalizedTool}`,
    }
  }

  return {
    name: "shouldUseTool",
    passed: mentionCheck.passed,
    detail: mentionCheck.detail,
  }
}

function buildAgentToolAbsenceEvidence(agent: string, tool: string, output: string): AssertionResult {
  const normalizedTool = normalizeToolName(tool)
  const toolsMap = buildToolsMap(agent)
  const restrictions = getToolRestrictions(agent)

  if (toolsMap && normalizedTool in toolsMap) {
    const disallowed = toolsMap[normalizedTool] === false
    return {
      name: "shouldNotUseTool",
      passed: disallowed,
      detail: disallowed
        ? `Tool explicitly disallowed for ${agent}: ${normalizedTool}`
        : `Tool explicitly allowed for ${agent}: ${normalizedTool}`,
    }
  }

  if (restrictions.denied?.includes(normalizedTool)) {
    return {
      name: "shouldNotUseTool",
      passed: true,
      detail: `Tool denied by restriction for ${agent}: ${normalizedTool}`,
    }
  }

  const containsCheck = mentionsToolByAlias(output, normalizedTool)
  return {
    name: "shouldNotUseTool",
    passed: !containsCheck.passed,
    detail: !containsCheck.passed
      ? `Tool not found in prompt guidance: ${normalizedTool}`
      : `Tool appears in prompt guidance: ${normalizedTool}`,
  }
}

function createReport(results: EvalResult[]): EvalReport {
  const passed = results.filter((r) => r.passed).length
  const failed = results.length - passed
  const totalWeight = results.reduce((sum, r) => sum + (r.scenario.weight ?? 1), 0)
  const weightedScore = totalWeight === 0
    ? 0
    : results.reduce((sum, r) => sum + r.score * (r.scenario.weight ?? 1), 0) / totalWeight

  const byAgent: EvalReport["byAgent"] = {}
  const byCategory: EvalReport["byCategory"] = {}

  for (const result of results) {
    const weight = result.scenario.weight ?? 1
    const agent = result.scenario.agent
    const category = result.scenario.category

    if (!byAgent[agent]) {
      byAgent[agent] = { total: 0, passed: 0, failed: 0, score: 0 }
    }
    if (!byCategory[category]) {
      byCategory[category] = { total: 0, passed: 0, failed: 0, score: 0 }
    }

    byAgent[agent].total += 1
    byAgent[agent].passed += result.passed ? 1 : 0
    byAgent[agent].failed += result.passed ? 0 : 1
    byAgent[agent].score += result.score * weight

    byCategory[category].total += 1
    byCategory[category].passed += result.passed ? 1 : 0
    byCategory[category].failed += result.passed ? 0 : 1
    byCategory[category].score += result.score * weight
  }

  for (const [agent, report] of Object.entries(byAgent)) {
    const agentWeight = results
      .filter((r) => r.scenario.agent === agent)
      .reduce((sum, r) => sum + (r.scenario.weight ?? 1), 0)
    report.score = agentWeight === 0 ? 0 : report.score / agentWeight
  }

  for (const [category, report] of Object.entries(byCategory)) {
    const categoryWeight = results
      .filter((r) => r.scenario.category === category)
      .reduce((sum, r) => sum + (r.scenario.weight ?? 1), 0)
    report.score = categoryWeight === 0 ? 0 : report.score / categoryWeight
  }

  return {
    timestamp: new Date().toISOString(),
    totalScenarios: results.length,
    passed,
    failed,
    score: weightedScore,
    byAgent,
    byCategory,
    results,
  }
}

export class EvalRunner {
  private readonly scenarios: EvalScenario[]

  constructor(scenarios: EvalScenario[]) {
    this.scenarios = scenarios
  }

  async run(options: EvalRunOptions = {}): Promise<EvalReport> {
    const mode = options.mode ?? "dry-run"
    const parallel = options.parallel ?? true
    const filtered = this.filterScenarios(options)

    const results = parallel
      ? await Promise.all(filtered.map((scenario) => this.runScenario(scenario, mode)))
      : await this.runSequentially(filtered, mode)

    return createReport(results)
  }

  private filterScenarios(options: EvalRunOptions): EvalScenario[] {
    const requestedTags = options.tags ?? []
    return this.scenarios.filter((scenario) => {
      if (options.agent && scenario.agent !== options.agent) return false
      if (options.category && scenario.category !== options.category) return false
      if (requestedTags.length > 0) {
        const scenarioTags = scenario.tags ?? []
        return requestedTags.some((tag) => scenarioTags.includes(tag))
      }
      return true
    })
  }

  private async runSequentially(scenarios: EvalScenario[], mode: "dry-run" | "live"): Promise<EvalResult[]> {
    const results: EvalResult[] = []
    for (const scenario of scenarios) {
      results.push(await this.runScenario(scenario, mode))
    }
    return results
  }

  private async runScenario(scenario: EvalScenario, mode: "dry-run" | "live"): Promise<EvalResult> {
    const start = Date.now()

    if (mode === "live") {
      return {
        scenario,
        passed: false,
        score: 0,
        duration: Date.now() - start,
        assertions: [{ name: "live-mode", passed: false, detail: "Live mode is not implemented yet" }],
        error: "Live mode is not implemented yet",
      }
    }

    try {
      const output = scenario.input.systemPromptOverride ?? AGENT_PROMPTS[scenario.agent]
      if (!output) {
        return {
          scenario,
          passed: false,
          score: 0,
          duration: Date.now() - start,
          assertions: [{ name: "agent-prompt", passed: false, detail: `Unknown agent prompt: ${scenario.agent}` }],
          error: `Unknown agent prompt: ${scenario.agent}`,
        }
      }

      const assertions: AssertionResult[] = []
      const expected = scenario.expected

      for (const needle of expected.shouldContain ?? []) {
        assertions.push(containsText(output, needle))
      }

      for (const forbidden of expected.shouldNotContain ?? []) {
        assertions.push(notContainsText(output, forbidden))
      }

      for (const pattern of expected.shouldMatchPattern ?? []) {
        assertions.push(matchesPattern(output, pattern))
      }

      if (typeof expected.minResponseLength === "number") {
        assertions.push(hasMinLength(output, expected.minResponseLength))
      }

      if (typeof expected.maxResponseLength === "number") {
        assertions.push(hasMaxLength(output, expected.maxResponseLength))
      }

      for (const tool of expected.shouldUseTool ?? []) {
        assertions.push(buildAgentToolEvidence(scenario.agent, tool, output))
      }

      for (const tool of expected.shouldNotUseTool ?? []) {
        assertions.push(buildAgentToolAbsenceEvidence(scenario.agent, tool, output))
      }

      for (const delegateName of expected.shouldDelegateTo ?? []) {
        assertions.push(matchesPattern(output, new RegExp(`\\b${escapeRegex(delegateName)}\\b`, "i")))
      }

      const provisionalResult: EvalResult = {
        scenario,
        passed: false,
        score: 0,
        duration: 0,
        assertions,
        output,
      }

      for (const customAssertion of expected.customAssertions ?? []) {
        const passed = customAssertion(provisionalResult)
        assertions.push({
          name: "customAssertion",
          passed,
          detail: passed ? "Custom assertion passed" : "Custom assertion failed",
        })
      }

      const passedAssertions = assertions.filter((a) => a.passed).length
      if (assertions.length === 0) {
        return {
          scenario,
          passed: false,
          score: 0,
          duration: Date.now() - start,
          assertions: [{
            name: "scenario-config",
            passed: false,
            detail: "Scenario defines no assertions",
          }],
          output,
          error: "Scenario defines no assertions",
        }
      }

      const score = passedAssertions / assertions.length
      const passed = assertions.every((a) => a.passed)

      return {
        scenario,
        passed,
        score,
        duration: Date.now() - start,
        assertions,
        output,
      }
    } catch (error) {
      return {
        scenario,
        passed: false,
        score: 0,
        duration: Date.now() - start,
        assertions: [{ name: "runtime", passed: false, detail: "Unexpected dry-run execution error" }],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
