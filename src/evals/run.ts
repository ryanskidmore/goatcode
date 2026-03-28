import { formatEvalReport } from "./reporter"
import { EvalRunner } from "./runner"
import { ALL_EVAL_SCENARIOS } from "./scenarios"
import type { EvalCategory, EvalMode } from "./types"

type OutputFormat = "console" | "json" | "markdown"

function parseArgValue(name: string, args: string[]): string | undefined {
  const prefix = `--${name}=`
  const match = args.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

function parseArgs(args: string[]): {
  agent?: string
  category?: EvalCategory
  format: OutputFormat
  mode: EvalMode
  tags?: string[]
  help: boolean
} {
  const category = parseArgValue("category", args) as EvalCategory | undefined
  const format = (parseArgValue("format", args) as OutputFormat | undefined) ?? "console"
  const mode = (parseArgValue("mode", args) as EvalMode | undefined) ?? "dry-run"
  const tags = parseArgValue("tags", args)?.split(",").map((tag) => tag.trim()).filter(Boolean)

  return {
    agent: parseArgValue("agent", args),
    category,
    format,
    mode,
    tags,
    help: args.includes("--help") || args.includes("-h"),
  }
}

function printUsage(): void {
  process.stdout.write(
    "Usage: bun run src/evals/run.ts [--agent=orchestrator] [--category=safety] [--format=console|json|markdown] [--mode=dry-run|live] [--tags=tag1,tag2]\n",
  )
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printUsage()
    return
  }

  const runner = new EvalRunner(ALL_EVAL_SCENARIOS)
  const report = await runner.run({
    mode: options.mode,
    agent: options.agent,
    category: options.category,
    tags: options.tags,
  })

  process.stdout.write(formatEvalReport(report, options.format) + "\n")
  process.exit(report.failed > 0 ? 1 : 0)
}

void main()
