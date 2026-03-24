# OcHead

OcHead is a professional agent harness for OpenCode. It provides a modular plugin architecture where every agent, tool, and hook is an independent plugin. This system allows for deep customization and reliable multi-agent orchestration.

## Overview

OcHead reimplements core agent capabilities with a focus on engineering quality and modularity. It uses a TypeScript-native configuration system and a micro-plugin registry to compose features.

Key features:
- 11 specialized agents for different task categories.
- 26 built-in tools including LSP integration and hash-anchored editing.
- 30 lifecycle hooks for context injection, error recovery, and quality control.
- Background agent parallelism for non-blocking work.
- TypeScript-native configuration with full type safety.

## Installation

Install OcHead via npm:

```bash
npm install ochead
```

OcHead requires Bun to run.

## Quick Start

Initialize OcHead in your project:

```bash
ochead install
```

This command sets up the initial configuration and verifies your environment.

## Configuration

OcHead uses a `ochead.config.ts` file in your project root. Use the `defineConfig` helper for full type support.

```typescript
import { defineConfig } from "ochead"

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

## Agents

OcHead includes 11 specialized agents.

| Agent | Description |
|-------|-------------|
| Orchestrator | Main coordinator that plans and delegates tasks. |
| DeepWorker | Autonomous worker for end-to-end execution. |
| PlanBuilder | Strategic planner that interviews the user to define scope. |
| Advisor | Read-only consultant for architecture and code review. |
| Researcher | Specialist for documentation and code search. |
| Explorer | Fast codebase search and pattern matching. |
| Executor | Task-oriented worker that follows a specific plan. |
| Analyst | Performs gap analysis and pre-planning reviews. |
| Reviewer | Verifies plans and code changes against requirements. |
| Inspector | Multimodal agent for analyzing images and PDFs. |
| Worker | General purpose executor for standard tasks. |

## Tools

OcHead provides 26 tools for agents to interact with your codebase.

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

OcHead uses 30 hooks to manage the agent lifecycle and improve output quality.

| Category | Hooks |
|----------|-------|
| Context | agents-injector, readme-injector, rules-injector, compaction |
| Recovery | edit-error, json-error, session-recovery, context-window-limit |
| Models | model-fallback, runtime-fallback, preemptive-compaction |
| Quality | comment-checker, write-file-guard, thinking-block-validator |
| Productivity | keyword-detector, think-mode, anthropic-effort |
| Output | tool-output-truncator, hashline-read-enhancer, hashline-diff-enhancer |
| Continuation | todo-enforcer, compaction-todo-preserver, stop-guard |
| Tasks | delegate-retry, empty-response-detector, task-resume-info, todowrite-disabler |
| Updates | auto-update-checker |

## CLI Commands

| Command | Description |
|---------|-------------|
| `ochead install` | Install and configure OcHead in the current directory. |
| `ochead doctor` | Check the health of your OcHead installation. |
| `ochead update` | Check for and install updates. |

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and architectural overview.
