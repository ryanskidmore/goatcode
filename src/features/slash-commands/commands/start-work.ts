import type { SlashCommand } from "../types";

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
2. **Decision logic**:
   - If \`plan-name\` is provided: resolve by exact/partial match and use that plan (or report no match)
   - Else if a plan is already in progress: continue the existing plan
   - Else: list available plan files and select one
3. **Read the plan file** and start executing tasks

## CRITICAL

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
};
