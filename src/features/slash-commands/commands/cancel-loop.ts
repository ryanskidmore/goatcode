import type { SlashCommand } from "../types"

export const cancelLoopCommand: SlashCommand = {
  name: "cancel-loop",
  description: "Cancel active loop and clear persisted loop state",
  template: `<command-instruction>
Cancel the currently active unified loop.

This will:
1. Stop the loop from continuing
2. Clear in-memory loop state for the session
3. Clear persisted loop state in .sisyphus/loop-state.json for the session
4. Allow the session to end normally

Check if a loop is active, cancel it, and inform the user of the result.
</command-instruction>`,
}
