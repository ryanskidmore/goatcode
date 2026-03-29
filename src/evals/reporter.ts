import pc from "picocolors"
import type { EvalReport } from "./types"

function formatPercent(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

export function formatConsoleReport(report: EvalReport): string {
  const lines: string[] = []
  const passRate = `${report.passed}/${report.totalScenarios}`
  lines.push(pc.bold("GoatCode Evals Report"))
  lines.push(`Timestamp: ${report.timestamp}`)
  lines.push(`Result: ${report.failed === 0 ? pc.green("PASS") : pc.red("FAIL")} (${passRate})`)
  lines.push(`Score: ${formatPercent(report.score)}`)
  lines.push("")

  for (const result of report.results) {
    const icon = result.passed ? pc.green("✔") : pc.red("✖")
    lines.push(`${icon} [${result.scenario.agent}] ${result.scenario.name} (${formatPercent(result.score)})`)
    if (!result.passed) {
      for (const assertion of result.assertions.filter((a) => !a.passed)) {
        lines.push(`  ${pc.red("- "+assertion.name)}: ${assertion.detail}`)
      }
      if (result.error) {
        lines.push(`  ${pc.red("- error")}: ${result.error}`)
      }
    }
  }

  lines.push("")
  lines.push("By agent:")
  for (const [agent, stats] of Object.entries(report.byAgent)) {
    lines.push(`- ${agent}: ${stats.passed}/${stats.total} (${formatPercent(stats.score)})`)
  }

  lines.push("")
  lines.push("By category:")
  for (const [category, stats] of Object.entries(report.byCategory)) {
    lines.push(`- ${category}: ${stats.passed}/${stats.total} (${formatPercent(stats.score)})`)
  }

  return lines.join("\n")
}

export function formatJsonReport(report: EvalReport): string {
  return JSON.stringify(report, null, 2)
}

export function formatMarkdownReport(report: EvalReport): string {
  const lines: string[] = []
  lines.push("## GoatCode Eval Report")
  lines.push("")
  lines.push(`- Timestamp: ${report.timestamp}`)
  lines.push(`- Total: ${report.totalScenarios}`)
  lines.push(`- Passed: ${report.passed}`)
  lines.push(`- Failed: ${report.failed}`)
  lines.push(`- Score: ${formatPercent(report.score)}`)
  lines.push("")
  lines.push("### Scenario Results")
  lines.push("")
  lines.push("| Agent | Scenario | Category | Passed | Score |")
  lines.push("|---|---|---|---:|---:|")
  for (const result of report.results) {
    lines.push(`| ${result.scenario.agent} | ${result.scenario.name} | ${result.scenario.category} | ${result.passed ? "✅" : "❌"} | ${formatPercent(result.score)} |`)
  }

  lines.push("")
  lines.push("### Summary by Agent")
  lines.push("")
  lines.push("| Agent | Passed | Failed | Score |")
  lines.push("|---|---:|---:|---:|")
  for (const [agent, stats] of Object.entries(report.byAgent)) {
    lines.push(`| ${agent} | ${stats.passed} | ${stats.failed} | ${formatPercent(stats.score)} |`)
  }

  lines.push("")
  lines.push("### Summary by Category")
  lines.push("")
  lines.push("| Category | Passed | Failed | Score |")
  lines.push("|---|---:|---:|---:|")
  for (const [category, stats] of Object.entries(report.byCategory)) {
    lines.push(`| ${category} | ${stats.passed} | ${stats.failed} | ${formatPercent(stats.score)} |`)
  }

  return lines.join("\n")
}

export function formatEvalReport(report: EvalReport, format: "console" | "json" | "markdown"): string {
  switch (format) {
    case "json":
      return formatJsonReport(report)
    case "markdown":
      return formatMarkdownReport(report)
    default:
      return formatConsoleReport(report)
  }
}
