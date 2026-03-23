import type { SlashCommand } from "../types"

export const refactorCommand: SlashCommand = {
  name: "refactor",
  description: "Intelligent refactoring command with LSP, AST-grep, architecture analysis, codemap, and TDD verification",
  template: `<command-instruction>
# Intelligent Refactor Command

## Usage

\`\`\`
/refactor <refactoring-target> [--scope=<file|module|project>] [--strategy=<safe|aggressive>]
\`\`\`

## What This Command Does

Performs intelligent, deterministic refactoring with full codebase awareness:

1. **Understands your intent** - Analyzes what you actually want to achieve
2. **Maps the codebase** - Builds a definitive codemap before touching anything
3. **Assesses risk** - Evaluates test coverage and determines verification strategy
4. **Plans meticulously** - Creates a detailed plan with Plan agent
5. **Executes precisely** - Step-by-step refactoring with LSP and AST-grep
6. **Verifies constantly** - Runs tests after each change to ensure zero regression

## Phase 0: Intent Gate (Mandatory First Step)

Before any action, classify and validate the request. If the target is ambiguous or
the desired outcome is unclear, ask clarifying questions before proceeding.

## Phase 1: Codebase Analysis

Fire parallel explore agents to find: target definitions, usages, related code,
similar patterns, tests, and architectural context.

## Phase 2: Build Codemap

Construct a definitive dependency map showing core files, dependency graph,
impact zones, and established patterns.

## Phase 3: Test Assessment

Analyze test coverage. If coverage is LOW (<50%) or NONE, pause and ask user
whether to add tests first or proceed with caution.

## Phase 4: Plan Generation

Invoke Plan agent with codemap and test coverage data to create atomic,
independently verifiable refactoring steps.

## Phase 5: Execute Refactoring

For each step: read current state, execute change, run lsp_diagnostics,
run tests, verify type check. NEVER proceed with failing tests.

## Phase 6: Final Verification

Run full test suite, type check, lint, and build verification.

## Critical Rules

- NEVER skip lsp_diagnostics check after changes
- NEVER proceed with failing tests
- NEVER use \`as any\`, \`@ts-ignore\`, \`@ts-expect-error\`
- ALWAYS preview ast_grep_replace with dryRun=true first
- ALWAYS follow existing codebase patterns
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`,
}
