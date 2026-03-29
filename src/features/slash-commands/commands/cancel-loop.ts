import type { SlashCommand } from "../types";

export const cancelLoopCommand: SlashCommand = {
  name: "cancel-loop",
  description: "Cancel active loop and clear persisted loop state",
  template: `<command-instruction>
Cancel the currently active unified loop.

This will:
1. Stop the loop from continuing
2. Clear in-memory loop state for the session
3. Remove only this session's loop entry from .sisyphus/loop-state.json (do not delete other sessions)
4. Allow the session to end normally

Check if a loop is active, cancel it, and inform the user of the result.
</command-instruction>`,
};
