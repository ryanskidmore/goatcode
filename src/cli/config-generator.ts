import { log } from "../shared/logger";
import { BUILTIN_AGENT_PLUGINS } from "../agents/builtin-agents";
import { DEFAULT_CATEGORY_DEFINITIONS } from "../features/categories/category-config";

/** All built-in agent names derived from BUILTIN_AGENT_PLUGINS. */
const BUILTIN_AGENT_NAMES = BUILTIN_AGENT_PLUGINS.map((p) => p.name);

/** All built-in category names derived from DEFAULT_CATEGORY_DEFINITIONS. */
const BUILTIN_CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORY_DEFINITIONS);

/** All built-in micro-plugin package names. */
const BUILTIN_MICRO_PLUGINS = BUILTIN_AGENT_PLUGINS.map((p) => `goatcode-sh/${p.name}`);

/** Options for config generation. */
export interface GenerateConfigOptions {
  /**
   * Whether to include the plugins array in the generated config.
   * Defaults to true.
   */
  includePlugins?: boolean;
  /**
   * Whether to include the agent overrides section.
   * Defaults to true.
   */
  includeAgents?: boolean;
  /**
   * Whether to include the category overrides section.
   * Defaults to true.
   */
  includeCategories?: boolean;
}

function buildAgentOverridesSection(): string {
  const lines: string[] = [];
  lines.push("  // Agent overrides — uncomment and customize individual agents.");
  lines.push("  // Each agent can override its model, temperature, prompt, and more.");
  lines.push("  // agents: {");
  for (const name of BUILTIN_AGENT_NAMES) {
    lines.push(`  //   "${name}": {`);
    lines.push('  //     // model: "provider/model-name",');
    lines.push("  //     // temperature: 0.7,");
    lines.push('  //     // prompt_append: "Additional instructions...",');
    lines.push("  //     // denied_tools: [],");
    lines.push("  //     // disable: false,");
    lines.push("  //   },");
  }
  lines.push("  // },");
  return lines.join("\n");
}

function buildCategoryOverridesSection(): string {
  const lines: string[] = [];
  lines.push("  // Category overrides — uncomment to set a default model per task category.");
  lines.push("  // Categories map to the type of work being performed.");
  lines.push("  // categories: {");
  for (const name of BUILTIN_CATEGORY_NAMES) {
    lines.push(`  //   "${name}": {`);
    lines.push('  //     // model: "provider/model-name",');
    lines.push('  //     // variant: "high",');
    lines.push('  //     // prompt_append: "Additional instructions...",');
    lines.push("  //   },");
  }
  lines.push("  // },");
  return lines.join("\n");
}

function buildPluginsSection(): string {
  const lines: string[] = [];
  lines.push("  // Micro-plugins to load — all built-in plugins are enabled by default.");
  lines.push("  // Add external plugin package names here to extend goatcode.");
  lines.push("  plugins: [");
  for (const plugin of BUILTIN_MICRO_PLUGINS) {
    lines.push(`    "${plugin}",`);
  }
  lines.push("  ],");
  return lines.join("\n");
}

/**
 * Generate the content of an `goatcode.config.ts` file.
 *
 * Returns a TypeScript source string that can be written directly to disk.
 * All agent and category overrides are commented out by default.
 * All built-in micro-plugins are listed and enabled.
 */
export function generateConfig(options: GenerateConfigOptions = {}): string {
  const { includePlugins = true, includeAgents = true, includeCategories = true } = options;

  log("config-generator: generating goatcode.config.ts", {
    includePlugins,
    includeAgents,
    includeCategories,
  });

  const sections: string[] = [];

  if (includeAgents) {
    sections.push(buildAgentOverridesSection());
  }

  if (includeCategories) {
    sections.push(buildCategoryOverridesSection());
  }

  if (includePlugins) {
    sections.push(buildPluginsSection());
  }

  const body = sections.join("\n\n");

  return [
    `import { defineConfig } from "goatcode-sh"`,
    ``,
    `export default defineConfig({`,
    body,
    `})`,
    ``,
  ].join("\n");
}
