import type { SlashCommand } from "../types"

export const loopCommand: SlashCommand = {
  name: "loop",
  description: "Start unified continuation loop until completion",
  template: `<command-instruction>
You are starting a unified LOOP that can run in memory or with disk persistence.

## How LOOP Works

1. You will work on the task continuously
2. When fully complete, output: \`<promise>{{COMPLETION_PROMISE}}</promise>\`
3. If the promise is not emitted, the loop injects a continuation prompt automatically

## Options

- \`--persist\`: use disk-backed state in \`.sisyphus/loop-state.json\` (resumable)
- without \`--persist\`: in-memory loop state (default)
- \`--max-iterations=N\`: set an explicit iteration limit

Default completion promise is "DONE".
Default max iterations is 100 for in-memory loops and unbounded for persisted loops.

## Exit Conditions

1. **Completion**: You emit the completion promise tag
2. **Max Iterations**: Loop stops at configured limit
3. **Cancel**: User runs \`/cancel-loop\`

## Your Task

Parse the arguments below and begin working on the task. The format is:
\`"task description" [--completion-promise=TEXT] [--max-iterations=N] [--persist] [--strategy=reset|continue]\`
</command-instruction>

<user-task>
$ARGUMENTS
</user-task>`,
}
