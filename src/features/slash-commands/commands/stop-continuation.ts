import type { SlashCommand } from "../types"

export const stopContinuationCommand: SlashCommand = {
  name: "stop-continuation",
  description: "Stop all continuation mechanisms (loop, todo continuation) for this session",
  template: `<command-instruction>
Stop all continuation mechanisms for the current session.

This command will:
1. Stop the todo-continuation-enforcer from automatically continuing incomplete tasks
2. Cancel any active unified Loop
3. Remove persisted loop state when applicable (.sisyphus/loop-state.json)

After running this command:
- The session will not auto-continue when idle
- You can manually continue work when ready
- Persisted loop sessions will remain stopped across sessions until explicitly restarted

Use this when you need to pause automated continuation and take manual control.
</command-instruction>`,
}
