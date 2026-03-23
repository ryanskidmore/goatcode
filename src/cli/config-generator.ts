import { log } from "../shared/logger"

/** All built-in agent names in the order they appear in the schema. */
const BUILTIN_AGENT_NAMES = [
  "orchestrator",
  "deep-worker",
  "plan-builder",
  "advisor",
  "researcher",
  "explorer",
  "executor",
  "analyst",
  "reviewer",
  "inspector",
  "worker",
] as const

/** All built-in category names in the order they appear in the schema. */
const BUILTIN_CATEGORY_NAMES = [
  "visual",
  "reasoning",
  "deep",
  "creative",
  "quick",
  "standard",
  "complex",
  "writing",
] as const

/** All built-in micro-plugin package names. */
const BUILTIN_MICRO_PLUGINS = [
  "ochead/orchestrator",
  "ochead/deep-worker",
  "ochead/plan-builder",
  "ochead/advisor",
  "ochead/researcher",
  "ochead/explorer",
  "ochead/executor",
  "ochead/analyst",
  "ochead/reviewer",
  "ochead/inspector",
  "ochead/worker",
] as const

/** Options for config generation. */
export interface GenerateConfigOptions {
  /**
   * Whether to include the plugins array in the generated config.
   * Defaults to true.
   */
  includePlugins?: boolean
  /**
   * Whether to include the agent overrides section.
   * Defaults to true.
   */
  includeAgents?: boolean
  /**
   * Whether to include the category overrides section.
   * Defaults to true.
   */
  includeCategories?: boolean
}

function buildAgentOverridesSection(): string {
  const lines: string[] = []
  lines.push("  // Agent overrides — uncomment and customize individual agents.")
  lines.push("  // Each agent can override its model, temperature, prompt, and more.")
  lines.push("  // agents: {")
  for (const name of BUILTIN_AGENT_NAMES) {
    lines.push(`  //   "${name}": {`)
    lines.push("  //     // model: \"provider/model-name\",")
    lines.push("  //     // temperature: 0.7,")
    lines.push("  //     // prompt_append: \"Additional instructions...\",")
    lines.push("  //     // denied_tools: [],")
    lines.push("  //     // disable: false,")
    lines.push("  //   },")
  }
  lines.push("  // },")
  return lines.join("\n")
}

function buildCategoryOverridesSection(): string {
  const lines: string[] = []
  lines.push("  // Category overrides — uncomment to set a default model per task category.")
  lines.push("  // Categories map to the type of work being performed.")
  lines.push("  // categories: {")
  for (const name of BUILTIN_CATEGORY_NAMES) {
    lines.push(`  //   ${name}: {`)
    lines.push("  //     // model: \"provider/model-name\",")
    lines.push("  //     // variant: \"high\",")
    lines.push("  //     // prompt_append: \"Additional instructions...\",")
    lines.push("  //   },")
  }
  lines.push("  // },")
  return lines.join("\n")
}

function buildPluginsSection(): string {
  const lines: string[] = []
  lines.push("  // Micro-plugins to load — all built-in plugins are enabled by default.")
  lines.push("  // Add external plugin package names here to extend ochead.")
  lines.push("  plugins: [")
  for (const plugin of BUILTIN_MICRO_PLUGINS) {
    lines.push(`    "${plugin}",`)
  }
  lines.push("  ],")
  return lines.join("\n")
}

/**
 * Generate the content of an `ochead.config.ts` file.
 *
 * Returns a TypeScript source string that can be written directly to disk.
 * All agent and category overrides are commented out by default.
 * All built-in micro-plugins are listed and enabled.
 */
export function generateConfig(options: GenerateConfigOptions = {}): string {
  const {
    includePlugins = true,
    includeAgents = true,
    includeCategories = true,
  } = options

  log("config-generator: generating ochead.config.ts", { includePlugins, includeAgents, includeCategories })

  const sections: string[] = []

  if (includeAgents) {
    sections.push(buildAgentOverridesSection())
  }

  if (includeCategories) {
    sections.push(buildCategoryOverridesSection())
  }

  if (includePlugins) {
    sections.push(buildPluginsSection())
  }

  const body = sections.join("\n\n")

  return [
    `import { defineConfig } from "ochead"`,
    ``,
    `export default defineConfig({`,
    body,
    `})`,
    ``,
  ].join("\n")
}
