import type { SlashCommand } from "../types"

export const startWorkCommand: SlashCommand = {
  name: "start-work",
  description: "Start Sisyphus work session from Prometheus plan",
  template: `<command-instruction>
You are starting a Sisyphus work session.

## ARGUMENTS

- \`/start-work [plan-name] [--worktree <path>]\`
  - \`plan-name\` (optional): name or partial match of the plan to start
  - \`--worktree <path>\` (optional): absolute path to an existing git worktree to work in

## WHAT TO DO

1. **Find available plans**: Search for Prometheus-generated plan files at \`.sisyphus/plans/\`
2. **Check for active boulder state**: Read \`.sisyphus/boulder.json\` if it exists
3. **Decision logic**:
   - If \`.sisyphus/boulder.json\` exists AND plan is NOT complete: continue work on existing plan
   - If no active plan OR plan is complete: list available plan files and select
4. **Create/Update boulder.json** before starting work
5. **Read the plan file** and start executing tasks

## CRITICAL

- Always update boulder.json BEFORE starting work
- Read the FULL plan file before delegating any tasks
- Follow atlas delegation protocols (7-section format)
- Decompose every plan task into granular, implementation-level sub-steps
</command-instruction>

<session-context>
Session ID: $SESSION_ID
Timestamp: $TIMESTAMP
</session-context>

<user-request>
$ARGUMENTS
</user-request>`,
}
