import { log } from "../../shared/logger"
import type { SlashCommand } from "./types"
import { loopCommand } from "./commands/loop"
import { cancelLoopCommand } from "./commands/cancel-loop"
import { startWorkCommand } from "./commands/start-work"
import { stopContinuationCommand } from "./commands/stop-continuation"
import { handoffCommand } from "./commands/handoff"
import { initDeepCommand } from "./commands/init-deep"

const COMMANDS: SlashCommand[] = [
  loopCommand,
  cancelLoopCommand,
  startWorkCommand,
  stopContinuationCommand,
  handoffCommand,
  initDeepCommand,
]

const COMMAND_MAP: Map<string, SlashCommand> = new Map()
for (const cmd of COMMANDS) {
  if (COMMAND_MAP.has(cmd.name)) {
    throw new Error(`Duplicate slash command name detected: ${cmd.name}`)
  }
  COMMAND_MAP.set(cmd.name, cmd)
}

export function getCommand(name: string): SlashCommand | undefined {
  const command = COMMAND_MAP.get(name)
  log("slash-commands: getCommand", { name, found: command !== undefined })
  return command
}

export function getAllCommands(): SlashCommand[] {
  log("slash-commands: getAllCommands", { count: COMMANDS.length })
  return [...COMMANDS]
}
