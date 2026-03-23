import type { SlashCommand } from "../types"

export const cancelUlwCommand: SlashCommand = {
  name: "cancel-ulw",
  description: "Cancel active ULW (ultrawork) loop and clear persisted state",
  template: `<command-instruction>
Cancel the currently active ULW (ultrawork) loop.

This will:
1. Stop the loop from continuing
2. Clear the in-memory ULW loop state
3. Remove the persisted state from .sisyphus/ulw-state.json
4. Allow the session to end normally

Check if a ULW loop is active, cancel it, and confirm the persisted state file has been removed. Inform the user of the result.
</command-instruction>`,
}
