import type { SlashCommand } from "../types"

export const stopContinuationCommand: SlashCommand = {
  name: "stop-continuation",
  description: "Stop all continuation mechanisms (ralph loop, ulw loop, todo continuation) for this session",
  template: `<command-instruction>
Stop all continuation mechanisms for the current session.

This command will:
1. Stop the todo-continuation-enforcer from automatically continuing incomplete tasks
2. Cancel any active Ralph Loop
3. Cancel any active ULW Loop and remove persisted ULW state (.sisyphus/ulw-state.json)

After running this command:
- The session will not auto-continue when idle
- You can manually continue work when ready
- ULW will remain stopped across sessions until explicitly restarted

Use this when you need to pause automated continuation and take manual control.
</command-instruction>`,
}
