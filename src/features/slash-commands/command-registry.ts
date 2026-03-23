import { log } from "../../shared/logger"
import type { SlashCommand } from "./types"
import { ralphLoopCommand } from "./commands/ralph-loop"
import { ulwLoopCommand } from "./commands/ulw-loop"
import { cancelRalphCommand } from "./commands/cancel-ralph"
import { cancelUlwCommand } from "./commands/cancel-ulw"
import { startWorkCommand } from "./commands/start-work"
import { stopContinuationCommand } from "./commands/stop-continuation"
import { handoffCommand } from "./commands/handoff"
import { initDeepCommand } from "./commands/init-deep"
import { refactorCommand } from "./commands/refactor"

const COMMANDS: SlashCommand[] = [
  ralphLoopCommand,
  ulwLoopCommand,
  cancelRalphCommand,
  cancelUlwCommand,
  startWorkCommand,
  stopContinuationCommand,
  handoffCommand,
  initDeepCommand,
  refactorCommand,
]

const COMMAND_MAP: Map<string, SlashCommand> = new Map(
  COMMANDS.map((cmd) => [cmd.name, cmd])
)

export function getCommand(name: string): SlashCommand | undefined {
  const command = COMMAND_MAP.get(name)
  log("slash-commands: getCommand", { name, found: command !== undefined })
  return command
}

export function getAllCommands(): SlashCommand[] {
  log("slash-commands: getAllCommands", { count: COMMANDS.length })
  return COMMANDS
}
