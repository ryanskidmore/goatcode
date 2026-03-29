import { Command } from "commander";
import { log } from "../shared/logger";
import { handleUpdateCommand } from "./commands/update";
import packageJson from "../../package.json" with { type: "json" };

const VERSION = packageJson.version;

export function createProgram(): Command {
  const program = new Command();

  program
    .name("goatcode-sh")
    .description(
      "Enterprise-grade OpenCode plugin with micro-plugin architecture and multi-agent orchestration",
    )
    .version(VERSION, "-v, --version", "Show version number");

  program
    .command("install")
    .description("Install and configure goatcode")
    .option("--non-interactive", "Skip interactive prompts and use defaults")
    .option("--force", "Overwrite existing config file")
    .action(async (options) => {
      log("cli: install command invoked");
      const { installCommand } = await import("./commands/install");
      await installCommand({ nonInteractive: options.nonInteractive, force: options.force });
    });

  program
    .command("doctor")
    .description("Check goatcode installation health and diagnose issues")
    .action(async () => {
      log("cli: doctor command invoked");
      const { runDoctor, printDoctorResult } = await import("./commands/doctor");
      const result = await runDoctor(process.cwd());
      printDoctorResult(result);
      process.exit(result.exitCode);
    });

  program
    .command("update")
    .description("Update goatcode to the latest version")
    .action(async () => {
      await handleUpdateCommand();
    });

  return program;
}

export function runCli(): void {
  const program = createProgram();
  program.parse();
}
