import { Command } from "commander"
import { log } from "../shared/logger"
import { handleUpdateCommand } from "./commands/update"
import packageJson from "../../package.json" with { type: "json" }

const VERSION = packageJson.version

export function createProgram(): Command {
  const program = new Command()

  program
    .name("ochead")
    .description("Enterprise-grade OpenCode plugin with micro-plugin architecture and multi-agent orchestration")
    .version(VERSION, "-v, --version", "Show version number")

  program
    .command("install")
    .description("Install and configure ochead")
    .action(() => {
      log("cli: install command invoked")
      process.stdout.write("install: not yet implemented\n")
    })

  program
    .command("doctor")
    .description("Check ochead installation health and diagnose issues")
    .action(async () => {
      log("cli: doctor command invoked")
      const { runDoctor, printDoctorResult } = await import("./commands/doctor")
      const result = await runDoctor(process.cwd())
      printDoctorResult(result)
      process.exit(result.exitCode)
    })

  program
    .command("update")
    .description("Update ochead to the latest version")
    .action(async () => {
      await handleUpdateCommand()
    })

  return program
}

export function runCli(): void {
  const program = createProgram()
  program.parse()
}
