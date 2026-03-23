import type { SlashCommand } from "../types"

export const cancelRalphCommand: SlashCommand = {
  name: "cancel-ralph",
  description: "Cancel active Ralph Loop",
  template: `<command-instruction>
Cancel the currently active Ralph Loop.

This will:
1. Stop the loop from continuing
2. Clear the loop state file
3. Allow the session to end normally

Check if a loop is active and cancel it. Inform the user of the result.
</command-instruction>`,
}
