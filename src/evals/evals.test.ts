import { describe, expect, it } from "bun:test"
import {
  containsText,
  hasMaxLength,
  hasMinLength,
  isStructured,
  matchesPattern,
  mentionsTools,
  notContainsText,
} from "./assertions"
import { formatConsoleReport, formatJsonReport, formatMarkdownReport } from "./reporter"
import { EvalRunner } from "./runner"
import { ALL_EVAL_SCENARIOS } from "./scenarios"

describe("eval assertions", () => {
  it("checks containsText and notContainsText", () => {
    expect(containsText("alpha beta", "alpha").passed).toBe(true)
    expect(notContainsText("alpha beta", "gamma").passed).toBe(true)
  })

  it("checks regex and length assertions", () => {
    expect(matchesPattern("version 1.2.3", /\d+\.\d+\.\d+/).passed).toBe(true)
    expect(hasMinLength("abcdef", 3).passed).toBe(true)
    expect(hasMaxLength("abcdef", 10).passed).toBe(true)
  })

  it("checks tool mentions and markdown structure", () => {
    const output = "## one\ncontent\n## two\nmore"
    expect(mentionsTools("Use grep and glob", ["grep", "glob"]).passed).toBe(true)
    expect(isStructured(output).passed).toBe(true)
  })
})

describe("eval runner", () => {
  it("runs dry-run scenarios with filtering", async () => {
    const runner = new EvalRunner(ALL_EVAL_SCENARIOS)
    const report = await runner.run({ mode: "dry-run", agent: "orchestrator" })

    expect(report.totalScenarios).toBeGreaterThanOrEqual(3)
    expect(Object.keys(report.byAgent)).toEqual(["orchestrator"])
    expect(report.failed).toBe(0)
  })

  it("executes all scenarios without runtime errors", async () => {
    const runner = new EvalRunner(ALL_EVAL_SCENARIOS)
    const report = await runner.run({ mode: "dry-run" })

    expect(report.totalScenarios).toBeGreaterThanOrEqual(21)
    expect(report.results.every((result) => result.error === undefined)).toBe(true)
    expect(report.failed).toBe(0)
  })

  it("returns placeholder failures for live mode", async () => {
    const runner = new EvalRunner(ALL_EVAL_SCENARIOS.slice(0, 1))
    const report = await runner.run({ mode: "live" })

    expect(report.totalScenarios).toBe(1)
    expect(report.failed).toBe(1)
    expect(report.results[0]?.error).toContain("not implemented")
  })
})

describe("eval reporter", () => {
  it("formats console, json, and markdown outputs", async () => {
    const runner = new EvalRunner(ALL_EVAL_SCENARIOS.slice(0, 2))
    const report = await runner.run({ mode: "dry-run" })

    const consoleOut = formatConsoleReport(report)
    const jsonOut = formatJsonReport(report)
    const markdownOut = formatMarkdownReport(report)

    expect(consoleOut).toContain("GoatCode Evals Report")
    expect(jsonOut).toContain("\"totalScenarios\"")
    expect(markdownOut).toContain("## GoatCode Eval Report")
    expect(markdownOut).toContain("| Agent | Scenario | Category | Passed | Score |")
  })
})
