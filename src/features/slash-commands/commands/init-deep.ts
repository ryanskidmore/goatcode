import type { SlashCommand } from "../types";

export const initDeepCommand: SlashCommand = {
  name: "init-deep",
  description: "Initialize hierarchical AGENTS.md knowledge base",
  template: `<command-instruction>
# /init-deep

Generate hierarchical AGENTS.md files. Root + complexity-scored subdirectories.

## Usage

\`\`\`
/init-deep                      # Update mode: modify existing + create new where warranted
/init-deep --create-new         # Read existing -> remove all -> regenerate from scratch
/init-deep --max-depth=2        # Limit directory depth (default: 3)
\`\`\`

## Workflow

1. **Discovery + Analysis** (concurrent)
   - Fire background explore agents immediately
   - Main session: bash structure + LSP codemap + read existing AGENTS.md
2. **Score & Decide** - Determine AGENTS.md locations from merged findings
3. **Generate** - Root first, then subdirs in parallel
4. **Review** - Deduplicate, trim, validate

## Critical Rules

- TodoWrite ALL phases. Mark in_progress -> completed in real-time.
- Root AGENTS.md is ALWAYS created
- Child AGENTS.md never repeats parent content
- Remove generic advice that applies to ALL projects
- Telegraphic style: dense, no filler
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`,
};
