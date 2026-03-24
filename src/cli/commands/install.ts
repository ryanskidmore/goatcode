import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { BUILTIN_AGENT_PLUGINS } from "../../agents/builtin-agents"
import { log } from "../../shared/logger"

interface InstallDefaults {
  autoUpdate: boolean
  plugins: string[]
}

export interface InstallCommandOptions {
  nonInteractive?: boolean
  force?: boolean
  cwd?: string
}

const CONFIG_FILE_NAME = "ochead.config.ts"

function getDefaultInstallConfig(): InstallDefaults {
  return {
    autoUpdate: true,
    plugins: BUILTIN_AGENT_PLUGINS.map((plugin) => plugin.name),
  }
}

function parseBooleanInput(inputValue: string, fallback: boolean): boolean {
  const normalized = inputValue.trim().toLowerCase()
  if (normalized === "") return fallback
  if (normalized === "y" || normalized === "yes" || normalized === "true") return true
  if (normalized === "n" || normalized === "no" || normalized === "false") return false
  return fallback
}

function parsePluginInput(inputValue: string, fallback: string[]): string[] {
  const normalized = inputValue.trim()
  if (normalized === "") return fallback
  return normalized
    .split(",")
    .map((part) => part.trim())
    .filter((value, index, array) => value !== "" && array.indexOf(value) === index)
}

function getConfigTemplate(config: InstallDefaults): string {
  const pluginLines = config.plugins.map((plugin) => `    ${JSON.stringify(plugin)},`).join("\n")
  return `import { defineConfig } from "ochead"

export default defineConfig({
  // Agent-level model and behavior overrides.
  agents: {},

  // Category-level defaults for delegated tasks.
  categories: {},

  // Disable built-in runtime components by name.
  disabled_agents: [],
  disabled_hooks: [],
  disabled_tools: [],
  disabled_skills: [],

  // Keep ochead updated automatically.
  auto_update: ${String(config.autoUpdate)},

  // External and internal micro-plugins to load.
  plugins: [
${pluginLines}
  ],
})
`
}

async function promptInstallConfig(defaults: InstallDefaults): Promise<InstallDefaults> {
  const rl = createInterface({ input, output })
  try {
    output.write("ochead install: interactive setup\n")
    const autoUpdateAnswer = await rl.question(
      `Enable auto-update checks? (Y/n) [${defaults.autoUpdate ? "Y" : "N"}]: `,
    )
    const pluginsAnswer = await rl.question(
      `Plugins (comma-separated) [${defaults.plugins.join(", ")}]: `,
    )

    return {
      autoUpdate: parseBooleanInput(autoUpdateAnswer, defaults.autoUpdate),
      plugins: parsePluginInput(pluginsAnswer, defaults.plugins),
    }
  } finally {
    rl.close()
  }
}

export async function installCommand(options: InstallCommandOptions = {}): Promise<string> {
  const defaults = getDefaultInstallConfig()
  const config = options.nonInteractive ? defaults : await promptInstallConfig(defaults)
  const configContent = getConfigTemplate(config)
  const targetDirectory = options.cwd ?? process.cwd()
  const configPath = resolve(targetDirectory, CONFIG_FILE_NAME)

  if (existsSync(configPath) && !options.force) {
    output.write(`${CONFIG_FILE_NAME} already exists at ${configPath}. Use --force to overwrite.\n`)
    return configPath
  }

  await writeFile(configPath, configContent, "utf8")

  log("cli: install config generated", {
    nonInteractive: options.nonInteractive ?? false,
    configPath,
  })
  output.write(`Created ${CONFIG_FILE_NAME} at ${configPath}\n`)

  return configPath
}

export { getConfigTemplate }
