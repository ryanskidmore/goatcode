# GoatCode

GoatCode is a professional agent harness for OpenCode. It provides a modular plugin architecture where every agent, tool, and hook is an independent plugin. This system allows for deep customization and reliable multi-agent orchestration.

## Overview

GoatCode reimplements core agent capabilities with a focus on engineering quality and modularity. It uses a TypeScript-native configuration system and a micro-plugin registry to compose features.

Key features:
- 7 specialized agents for different task categories.
- 26 built-in tools including LSP integration and hash-anchored editing.
- 27 lifecycle hooks for context injection, error recovery, and quality control.
- Background agent parallelism for non-blocking work.
- TypeScript-native configuration with full type safety.

## Installation

Install GoatCode via npm:

```bash
npm install goatcode-sh
```

GoatCode requires Bun to run.

## Quick Start

Initialize GoatCode in your project:

```bash
goatcode install
```

This command sets up the initial configuration and verifies your environment.

## Configuration

GoatCode uses a `goatcode.config.ts` file in your project root. Use the `defineConfig` helper for full type support.

```typescript
import { defineConfig } from "goatcode-sh"

export default defineConfig({
  agents: {
    orchestrator: {
      model: "anthropic/claude-3-5-sonnet",
      temperature: 0
    }
  },
  plugins: [
    // Add external plugins here
  ]
})
```

You can also configure GoatCode at the user level by creating `~/.config/goatcode/config.ts`. User-level configuration is merged with project-level configuration, allowing for persistent preferences across projects.

## Agents

GoatCode includes 7 specialized agents.

| Agent | Description |
|-------|-------------|
| Orchestrator | Main coordinator that plans and delegates tasks. |
| DeepWorker | Autonomous worker for end-to-end execution. |
| PlanBuilder | Strategic planner that interviews the user to define scope. |
| Advisor | Read-only consultant for architecture and code review. |
| Researcher | Specialist for documentation and code search. |
| Explorer | Fast codebase search and pattern matching. |
| Worker | General purpose executor for standard tasks. |

## Tools

GoatCode provides 26 tools for agents to interact with your codebase.

| Category | Tools |
|----------|-------|
| LSP | goto_definition, find_references, symbols, diagnostics, prepare_rename, rename |
| Search | ast_grep_search, ast_grep_replace, grep, glob |
| Editing | hashline_edit |
| Delegation | task_delegate |
| Background | background_output, background_cancel |
| Session | session_list, session_read, session_search, session_info |
| Skills | skill_load, skill_mcp_invoke |
| System | interactive_bash, look_at |
| Tasks | task_create, task_list, task_get, task_update |

## Hooks

GoatCode uses 28 hooks to manage the agent lifecycle and improve output quality.

| Category | Hooks |
|----------|-------|
| Context | context-injector, compaction-context, phase-reminder |
| Recovery | edit-error, json-error, session-recovery, context-window-limit |
| Models | model-fallback, runtime-fallback, preemptive-compaction |
| Quality | comment-checker, write-file-guard, thinking-block-validator |
| Productivity | keyword-detector, think-mode, anthropic-effort |
| Output | tool-output-truncator, hashline-read-enhancer, hashline-diff-enhancer |
| Continuation | todo-enforcer, compaction-todo-preserver, stop-guard, foreground-fallback |
| Tasks | delegate-retry, empty-response-detector, task-resume-info, todowrite-disabler |
| Nudges | post-read-nudge |

## CLI Commands

| Command | Description |
|---------|-------------|
| `goatcode install` | Install and configure GoatCode in the current directory. |
| `goatcode doctor` | Check the health of your GoatCode installation. |
| `goatcode update` | Check for and install updates. |

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and architectural overview.
