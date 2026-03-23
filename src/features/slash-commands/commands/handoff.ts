import type { SlashCommand } from "../types"

export const handoffCommand: SlashCommand = {
  name: "handoff",
  description: "Create a detailed context summary for continuing work in a new session",
  template: `<command-instruction>
# Handoff Command

## Purpose

Use /handoff when:
- The current session context is getting too long and quality is degrading
- You want to start fresh while preserving essential context from this session
- The context window is approaching capacity

This creates a detailed context summary that can be used to continue work in a new session.

## PHASE 1: GATHER PROGRAMMATIC CONTEXT

Execute these tools to gather concrete data:

1. session_read({ session_id: "$SESSION_ID" }) - full session history
2. todoread() - current task progress
3. Bash({ command: "git diff --stat HEAD~10..HEAD" }) - recent file changes
4. Bash({ command: "git status --porcelain" }) - uncommitted changes

## PHASE 2: EXTRACT CONTEXT

Write the context summary from first person perspective ("I did...", "I told you...").

Focus on:
- Capabilities and behavior, not file-by-file implementation details
- What matters for continuing the work
- USER REQUESTS (AS-IS) must be verbatim (do not paraphrase)
- EXPLICIT CONSTRAINTS must be verbatim only (do not invent)

## PHASE 3: FORMAT OUTPUT

Generate a handoff summary using the HANDOFF CONTEXT format with sections:
USER REQUESTS (AS-IS), GOAL, WORK COMPLETED, CURRENT STATE, PENDING TASKS,
KEY FILES, IMPORTANT DECISIONS, EXPLICIT CONSTRAINTS, CONTEXT FOR CONTINUATION.

## IMPORTANT CONSTRAINTS

- DO NOT attempt to programmatically create new sessions
- DO provide a self-contained summary that works without access to this session
- DO NOT include sensitive information (API keys, credentials, secrets)
- DO NOT exceed 10 files in the KEY FILES section
</command-instruction>

<session-context>
Session ID: $SESSION_ID
Timestamp: $TIMESTAMP
</session-context>

<user-request>
$ARGUMENTS
</user-request>`,
}
