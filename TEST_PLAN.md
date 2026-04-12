# GoatCode Feature Inventory & Test Plan

Comprehensive inventory of every agent, tool, hook, feature, and configurable surface in the GoatCode plugin.

---

## 1. Agents (7)

GoatCode defines 7 specialized agents, each registered as a micro-plugin.

| Agent | Default Model | Fallback Models | Mode | Tool Restrictions | Source |
|-------|--------------|-----------------|------|-------------------|--------|
| **orchestrator** | `claude-opus-4-6` | `gpt-5.4` | `all` | None (full access) | `src/agents/orchestrator/` |
| **deepworker** | `gpt-5.3-codex` | `claude-opus-4-6` | `all` | None (full access) | `src/agents/deepworker/` |
| **planner** | `claude-opus-4-6` | `gpt-5.4` | `all` | None (full access) | `src/agents/planner/` |
| **advisor** | `gpt-5.4` | `claude-opus-4-6` | `subagent` | Denied: `write`, `edit`, `bash`, `interactive_bash`, `delegate_task`, `task_create`, `task_update` | `src/agents/advisor/` |
| **researcher** | `gemini-3-flash` | `claude-haiku-4.5` | `all` | None (full access) | `src/agents/researcher/` |
| **explorer** | `claude-haiku-4.5` | `gpt-5.4-nano` | `subagent` | Allowed-only: `read`, `glob`, `grep`, `lsp_*`, `ast_grep_search`, `look_at`, `todowrite` | `src/agents/explorer/` |
| **worker** | `claude-sonnet-4.6` | `gpt-5.3-codex` | `subagent` | None (full access) | `src/agents/worker/` |

### Agent Modes

- **`primary`**: Respects the user-selected UI model.
- **`subagent`**: Uses its own fallback chain, ignores UI selection.
- **`all`**: Available in both primary and subagent contexts.

### Agent Fallback Chains (Provider-Aware)

Each agent has a provider-aware fallback chain in `src/agents/fallback-chains.ts`. Resolution picks the first model whose provider is connected.

| Agent | Chain |
|-------|-------|
| orchestrator | anthropic:`claude-opus-4-6`(max) → openai:`gpt-5.4`(medium) → google:`gemini-3.1-pro-preview` |
| deepworker | openai:`gpt-5.3-codex`(medium) → anthropic:`claude-opus-4-6`(max) |
| planner | openai:`gpt-5.4`(high) → google:`gemini-3.1-pro-preview` → anthropic:`claude-sonnet-4-6` |
| advisor | anthropic:`claude-opus-4-6`(max) → openai:`gpt-5.4`(high) |
| researcher | openai:`gpt-5.3-codex`(medium) → anthropic:`claude-sonnet-4-6` |
| explorer | anthropic:`claude-haiku-4-5` → openai:`gpt-5.4-mini` → google:`gemini-3.1-flash-lite-preview` |
| worker | anthropic:`claude-sonnet-4-6` → openai:`gpt-5.3-codex`(medium) |

---

## 2. Tools (23 registered + 1 disabled)

All tools are registered in `src/tools/builtin-tools.ts`.

### 2.1 Search Tools

| Tool | Description | Source |
|------|-------------|--------|
| **grep** | Content search using regular expressions with safety limits (60s timeout, 256KB output) | `src/tools/grep/` |
| **glob** | Fast file pattern matching with safety limits (60s timeout, 100 file limit) | `src/tools/glob/` |
| **ast_grep_search** | AST-aware code pattern search across 25 languages using meta-variables | `src/tools/ast-grep/search/` |
| **ast_grep_replace** | AST-aware code pattern replacement with dry-run support | `src/tools/ast-grep/replace/` |

### 2.2 LSP Tools

| Tool | Description | Source |
|------|-------------|--------|
| **lsp_goto_definition** | Jump to symbol definition | `src/tools/lsp/` |
| **lsp_find_references** | Find all usages/references of a symbol across the workspace | `src/tools/lsp/` |
| **lsp_symbols** | Get document symbols or search workspace symbols | `src/tools/lsp/` |
| **lsp_diagnostics** | Get errors, warnings, hints from language server | `src/tools/lsp/` |
| **lsp_prepare_rename** | Check if a rename operation is valid before executing | `src/tools/lsp/` |
| **lsp_rename** | Rename symbol across entire workspace | `src/tools/lsp/` |

### 2.3 Editing Tools

| Tool | Description | Source |
|------|-------------|--------|
| **hashline_edit** | Edit files using LINE#HASH anchors for precise, safe modifications | `src/tools/hashline-edit/` |

### 2.4 Delegation & Background Tools

| Tool | Description | Source |
|------|-------------|--------|
| **delegate_task** | Delegate a task to a category-based agent with model routing | `src/tools/delegate-task/` |
| **background_output** | Get output from a background task, with blocking/timeout support | `src/tools/background-task/output/` |
| **background_cancel** | Cancel running background task(s) | `src/tools/background-task/` |

### 2.5 Session Tools

| Tool | Description | Source |
|------|-------------|--------|
| **session_list** | List all OpenCode sessions with optional filtering | `src/tools/session-manager/` |
| **session_read** | Read messages and history from an OpenCode session | `src/tools/session-manager/` |
| **session_search** | Search for content within OpenCode session messages | `src/tools/session-manager/` |
| **session_info** | Get metadata and statistics about an OpenCode session | `src/tools/session-manager/` |

### 2.6 Task Management Tools

| Tool | Description | Source |
|------|-------------|--------|
| **task_create** | Create a new task with subject, content, priority, status | `src/tools/task/` |
| **task_list** | List tasks with optional status/priority filtering | `src/tools/task/` |
| **task_get** | Get a task by ID with full details | `src/tools/task/` |
| **task_update** | Update an existing task's subject, content, status, or priority | `src/tools/task/` |

### 2.7 Utility Tools

| Tool | Description | Source |
|------|-------------|--------|
| **skill** | Load a skill to get detailed instructions for a specific task | `src/tools/skill/` |
| **look_at** | Extract basic information from media files (PDFs, images, diagrams) | `src/tools/look-at/` |

### 2.8 Disabled Tools

| Tool | Reason | Source |
|------|--------|--------|
| **skill_mcp** | Requires `ctx.client` MCP integration not yet available in tool execute context | `src/tools/skill-mcp/` (commented out) |

### 2.9 OpenCode Built-in Tools (not GoatCode-provided)

These tools come from OpenCode itself and are referenced in tool restrictions but not registered by GoatCode:

- `read`, `write`, `edit`, `bash`, `task`, `todowrite`, `webfetch`, `websearch`, `codesearch`, `interactive_bash`

---

## 3. Hooks (32)

All hooks are registered in `src/hooks/builtin-hooks.ts`. Hooks attach to lifecycle events to modify behavior.

### 3.1 Context Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **context-injector** | `chatParams` / messages transform | Injects AGENTS.md, project context, and system instructions into agent prompts | `src/hooks/context-injector/` |
| **compaction-context** | `chatParams` | Preserves critical context across message compaction events | `src/hooks/compaction-context/` |
| **phase-reminder** | messages transform | Injects phase-specific reminders into the message stream | `src/hooks/phase-reminder/` |
| **skill-discovery** | `chatParams` | Injects available skill list into system prompt so agents know what skills exist | `src/hooks/skill-discovery/` |

### 3.2 Recovery Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **edit-error** | `toolExecuteAfter` | Detects and provides recovery guidance when edit tool calls fail | `src/hooks/edit-error/` |
| **json-error** | `toolExecuteAfter` | Detects and provides recovery guidance for JSON parsing errors | `src/hooks/json-error/` |
| **session-recovery** | `event` | Handles session recovery scenarios (crash recovery, reconnection) | `src/hooks/session-recovery/` |
| **context-window-limit** | `event` | Detects context window limit events and triggers appropriate response | `src/hooks/context-window-limit/` |
| **error-diagnostics** | `toolExecuteAfter` | Provides pattern-matched diagnostic guidance for common error types | `src/hooks/error-diagnostics/` |

### 3.3 Model Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **model-fallback** | `event` | Automatically falls back to next model in chain when current model fails | `src/hooks/model-fallback/` |
| **runtime-fallback** | `event` | Falls back to alternative runtime when primary runtime encounters errors | `src/hooks/runtime-fallback/` |
| **preemptive-compaction** | message hook | Triggers compaction before context window is exhausted | `src/hooks/preemptive-compaction/` |

### 3.4 Quality Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **comment-checker** | `preToolUse` | Validates that code changes don't contain low-quality placeholder comments | `src/hooks/comment-checker/` |
| **write-file-guard** | `toolExecuteAfter` | Guards against writing files that shouldn't be written (e.g., writing without reading first) | `src/hooks/write-file-guard/` |
| **thinking-block-validator** | messages transform | Validates and sanitizes thinking blocks in model output | `src/hooks/thinking-block-validator/` |
| **tool-pairing-validator** | messages transform | Validates tool call sequences (e.g., read before edit) | `src/hooks/tool-pairing-validator/` |

### 3.5 Productivity Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **keyword-detector** | `chatMessage` | Detects keywords in user messages (e.g., "ultrawork") and triggers modes | `src/hooks/keyword-detector/` |
| **think-mode** | `chatParams` | Enables extended thinking mode when appropriate | `src/hooks/think-mode/` |
| **anthropic-effort** | `chatParams` | Sets Anthropic-specific effort/budget parameters on requests | `src/hooks/anthropic-effort/` |
| **ultrawork-mode** | `chatParams` | Activates ultrawork autonomous execution mode when triggered by keyword | `src/hooks/ultrawork-mode/` |

### 3.6 Output Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **tool-output-truncator** | `toolExecuteAfter` | Truncates oversized tool outputs to stay within context limits | `src/hooks/tool-output-truncator/` |
| **hashline-read-enhancer** | `toolExecuteAfter` | Enhances read tool output with LINE#HASH anchors for hashline_edit | `src/hooks/hashline-read-enhancer/` |
| **hashline-diff-enhancer** | `toolExecuteAfter` | Enhances diff output with LINE#HASH anchors | `src/hooks/hashline-diff-enhancer/` |

### 3.7 Continuation Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **todo-enforcer** | session idle | Enforces completion of todo list items before session ends | `src/hooks/todo-enforcer/` |
| **compaction-todo-preserver** | compaction | Preserves todo state across message compaction | `src/hooks/compaction-todo-preserver/` |
| **stop-guard** | event | Prevents premature session termination when work remains | `src/hooks/stop-guard/` |
| **foreground-fallback** | event | Falls back to foreground execution when background task fails | `src/hooks/foreground-fallback/` |

### 3.8 Task Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **delegate-retry** | `toolExecuteAfter` | Retries failed delegate_task operations with fallback strategy | `src/hooks/delegate-retry/` |
| **empty-response-detector** | `toolExecuteAfter` | Detects when a delegated task returns an empty response and handles recovery | `src/hooks/empty-response-detector/` |
| **task-resume-info** | `toolExecuteAfter` | Provides context when resuming tasks from background sessions | `src/hooks/task-resume-info/` |
| **todowrite-disabler** | `toolExecuteAfter` | Disables todowrite tool for subagents to prevent todo conflicts | `src/hooks/todowrite-disabler/` |

### 3.9 Nudge Hooks

| Hook | Lifecycle Point | Behavior | Source |
|------|----------------|----------|--------|
| **post-read-nudge** | `toolExecuteAfter` | Injects delegation nudge after file reads to prevent context bloat from repeated reads | `src/hooks/post-read-nudge/` |

---

## 4. Features (6)

### 4.1 Background Agent System

Manages spawning and lifecycle of background agent sessions for parallel task execution.

| Component | Description | Source |
|-----------|-------------|--------|
| Spawner | Creates background OpenCode sessions with model resolution | `src/features/background-agent/spawner.ts` |
| Manager | Tracks background task state (queued/running/completed/failed/cancelled) | `src/features/background-agent/manager.ts` |
| Types | `BackgroundTask`, `LaunchInput` interfaces | `src/features/background-agent/types.ts` |

### 4.2 Loop System

Manages autonomous loop execution with both memory-backed and file-persisted state.

| Component | Description | Source |
|-----------|-------------|--------|
| Plugin | Registers as `loop` plugin, listens to events | `src/features/loops/plugin.ts` |
| Handler | Core loop logic with start/stop/iteration tracking | `src/features/loops/handler.ts` |
| State | `LoopState`, `LoopOptions`, `LoopStore` types | `src/features/loops/state.ts` |
| Memory Store | In-memory loop state (default for non-persisted) | `src/features/loops/memory-store.ts` |
| File Store | File-persisted loop state (for persist mode) | `src/features/loops/file-store.ts` |

### 4.3 Auto-Update

Checks for GoatCode updates on first session creation.

| Component | Description | Source |
|-----------|-------------|--------|
| Plugin | Fires once per process on `session.created` event | `src/features/auto-update/plugin.ts` |
| Update Checker | Compares current version against latest available | `src/features/auto-update/update-checker.ts` |

### 4.4 Skills System

Provides loadable instruction sets for specialized workflows.

| Component | Description | Source |
|-----------|-------------|--------|
| Skill Loader | Loads and merges built-in + project-level skills | `src/features/skills/skill-loader.ts` |
| Skill Merger | Merges built-in skills with project overrides | `src/features/skills/skill-merger.ts` |
| Built-in: `git-gud` | Git operations: atomic commits, branch strategy, rebase/push safety, PR/MR readiness | `src/features/skills/builtin/git-gud.ts` |
| Sync | Writes built-in skills to `~/.local/share/goatcode-sh/skills/` as SKILL.md files | `src/features/skills/index.ts` |

### 4.5 Categories System

Maps task types to optimal models for delegation routing.

| Category | Default Model | Variant | Description |
|----------|--------------|---------|-------------|
| **visual-engineering** | `gemini-3.1-pro` | `high` | Frontend, UI/UX, design, styling, animation |
| **ultrabrain** | `gpt-5.4` | `xhigh` | Hard logic, architecture decisions, complex reasoning |
| **deep** | `gpt-5.3-codex` | `medium` | Goal-oriented autonomous problem-solving, deep research |
| **artistry** | `gemini-3.1-pro` | `high` | Creative approaches, unconventional solutions |
| **quick** | `gpt-5.4-mini` | - | Trivial tasks, single file changes, typo fixes |
| **unspecified-low** | `claude-sonnet-4-6` | - | Moderate effort tasks that don't fit other categories |
| **unspecified-high** | `claude-opus-4-6` | `max` | High effort tasks that don't fit other categories |
| **writing** | `gemini-3.1-flash-lite` | - | Documentation, prose, technical writing |

Each category has its own provider-aware fallback chain (defined in `src/agents/fallback-chains.ts`).

### 4.6 Prompt Builder

Dynamically constructs agent system prompts with context-aware sections.

| Component | Description | Source |
|-----------|-------------|--------|
| Dynamic Prompt Builder | Assembles system prompts from sections | `src/features/prompt-builder/dynamic-prompt-builder.ts` |
| Agent Table Builder | Generates agent capability tables for prompts | `src/features/prompt-builder/agent-table-builder.ts` |
| Category Section Builder | Generates category routing info for prompts | `src/features/prompt-builder/category-section-builder.ts` |
| Skill Section Builder | Generates available skills info for prompts | `src/features/prompt-builder/skill-section-builder.ts` |

---

## 5. Configuration

### 5.1 Config Schema (`src/config/schema.ts`)

Top-level `goatcode.config.ts` schema via `defineConfig()`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agents` | `AgentOverrides` | - | Per-agent overrides (model, temperature, prompt_append, denied_tools, disable, fallback_models) |
| `categories` | `CategoryOverrides` | - | Per-category overrides (model, variant, description, prompt_append) |
| `default_temperature` | `number (0-2)` | from defaults | Default sampling temperature for all agents |
| `default_provider` | `string` | - | Preferred provider for model resolution |
| `provider_priority` | `string[]` | from defaults | Provider preference order for fallback resolution |
| `disabled_agents` | `string[]` | `[]` | Agent names to disable entirely |
| `disabled_hooks` | `string[]` | `[]` | Hook names to disable entirely |
| `disabled_tools` | `string[]` | `[]` | Tool names to disable entirely |
| `disabled_skills` | `string[]` | `[]` | Skill names to disable entirely |
| `auto_update` | `boolean` | from defaults | Enable/disable auto-update checking |
| `plugins` | `string[]` | - | External plugin package names to load |

### 5.2 Agent Override Config

Per-agent customization (applies to any of the 7 agents):

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Override model identifier |
| `variant` | `string` | Override model variant |
| `temperature` | `number` | Override sampling temperature |
| `top_p` | `number` | Override nucleus sampling |
| `prompt_append` | `string` | Additional text appended to system prompt |
| `denied_tools` | `string[]` | Tools explicitly denied for this agent |
| `disable` | `boolean` | Disable the agent entirely |
| `fallback_models` | `string \| string[]` | Custom fallback model chain |

### 5.3 User-Level Config

Generated at `~/.config/opencode/goatcode.ts` via `src/config/ensure-user-config.ts`. Includes provider priority, agent overrides, category overrides.

---

## 6. Plugin Architecture

### 6.1 Plugin Definition

Every agent, tool, hook, and feature is a `PluginDefinition`:

```typescript
{
  name: string;
  version?: string;
  dependencies?: string[];
  agents?: Record<string, AgentConfig>;
  tools?: Record<string, ToolConfig>;
  hooks?: {
    event?: Function;
    chatParams?: Function;
    chatMessage?: Function;
    toolExecuteAfter?: Function;
    preToolUse?: Function;
    // messages transforms, etc.
  };
  setup?: (ctx: OpenCodeContext) => Promise<void>;
  teardown?: () => Promise<void>;
}
```

### 6.2 Plugin Lifecycle

1. **Registration**: All built-in + external plugins registered with `PluginRegistry`.
2. **Resolution**: Dependency resolution via `registry.resolve()`.
3. **Setup**: `registry.setup()` runs each plugin's `setup()` with `OpenCodeContext`.
4. **Aggregation**: `registry.aggregate()` merges all contributions, applying `disabled_*` config.
5. **Composition**: `compose()` produces final `Hooks` object for OpenCode.

### 6.3 External Plugins

Loaded from `config.plugins` array in `goatcode.config.ts`. Each entry is an npm package name that exports a valid `PluginDefinition`.

---

## 7. Provider Discovery & Model Resolution

### 7.1 Provider Discovery (`src/shared/provider-discovery.ts`)

- Queries `ctx.client.provider.list()` on bootstrap (15s timeout).
- Builds an in-memory discovery index of connected providers.
- Writes a disk cache for subsequent config hook reads.

### 7.2 Model Resolution Pipeline (`src/shared/model-resolution-pipeline.ts`)

- Resolves model identifiers using provider-aware fallback chains.
- Supports qualified (`provider/model`) and unqualified model references.
- Falls back through provider priority list when preferred provider is unavailable.

### 7.3 Connected Providers Cache (`src/shared/connected-providers-cache.ts`)

- Persists connected provider information to disk.
- Enables fast startup without blocking on provider discovery.

---

## 8. Delegation System

### 8.1 Task Delegation (`src/tools/delegate-task/`)

- Routes tasks to subagents based on category and subagent type.
- Supports `run_in_background` for async execution.
- Maximum delegation depth: **2 levels** (User → Orchestrator → Specialist → Sub-agent cannot delegate further).
- Session continuation via `session_id` parameter.
- Skill loading via `load_skills` parameter.

### 8.2 Subagent Types

Available as `subagent_type` in `delegate_task`:
- `orchestrator`, `deepworker`, `planner`, `advisor`, `researcher`, `explorer`, `worker`
- Plus `general` (maps to category-based agent selection)

---

## 9. CLI

### 9.1 Commands

| Command | Description |
|---------|-------------|
| `goatcode install` | Set up GoatCode config in current directory, generate `goatcode.config.ts` |
| `goatcode update` | Check for and install updates |

### 9.2 Config Generator (`src/cli/config-generator.ts`)

- `generateConfig()`: Generates project-level `goatcode.config.ts` with commented-out agent/category overrides.
- `generateUserConfig()`: Generates user-level config at `~/.config/opencode/goatcode.ts` with provider settings.

---

## 10. Existing Test Coverage Audit

### 10.1 Overview

| Metric | Value |
|--------|-------|
| **Test Framework** | Bun (`bun:test`) — all files |
| **Total Test Files** | **32** |
| **File Convention** | `*.test.ts` collocated next to source |
| **Estimated Module Coverage** | ~60-65% |

### 10.2 Test Files by Area

**Agents (4 files)**
- `src/agents/explorer/plugin.test.ts` — plugin metadata/mode
- `src/agents/orchestrator/plugin.test.ts` — plugin metadata/prompt
- `src/agents/model-resolution.test.ts` (185 lines) — `resolveModel` with override/fallback chains, provider priority
- `src/agents/prompt-registry.test.ts` (98 lines) — registry completeness, semver/date validation

**Tools (11 files) — Heaviest coverage area**
- `src/tools/hashline-edit/hashline-edit.test.ts` (734 lines — most thorough file) — all 6 edit operations, hash validation, overlap detection, edge cases
- `src/tools/hashline-edit/handler.test.ts` (312 lines) — end-to-end with real temp files
- `src/tools/delegate-task/delegate-task.test.ts` (486 lines) — 8 categories, background/sync, metadata
- `src/tools/background-task/output/handler.test.ts` (281 lines) — status handling, blocking, full_session mode
- `src/tools/session-manager/session-manager.test.ts` (264 lines) + `list/handler.test.ts` (122 lines)
- `src/tools/code-search.test.ts` (203 lines) — ast-grep, grep, glob plugins
- `src/tools/ast-grep/search/handler.test.ts` + `replace/handler.test.ts` (95 lines each)
- `src/tools/lsp/lsp-tools.test.ts` (198 lines) — all 6 LSP tool plugins
- `src/tools/skill/handler.test.ts` (57 lines)

**Hooks (6 files)**
- `src/hooks/task-resume-info/handler.test.ts` (282 lines) — session ID extraction, continuation hints
- `src/hooks/delegate-retry/handler.test.ts` (212 lines) — error detection (7 patterns), guidance builder
- `src/hooks/error-diagnostics/handler.test.ts` (172 lines) — rate limit, permission, timeout errors
- `src/hooks/tool-pairing-validator/handler.test.ts` (104 lines) — orphaned block repair
- `src/hooks/keyword-detector/handler.test.ts` (146 lines) — 7 keywords, code block exclusion
- `src/hooks/ultrawork-mode/handler.test.ts` (153 lines) — thinking injection, duplicate prevention

**Features (3 files)**
- `src/features/background-agent/manager.test.ts` (249 lines) — launch, idle completion, timeout
- `src/features/background-agent/spawner.test.ts` (47 lines)
- `src/features/skills/skills.test.ts` (120 lines) — builtin/project skill loading, merging

**Config (2 files)**, **Bootstrap (1 file)**, **Prompt Builder (1 file)**, **CLI (1 file)**, **Shared (2 files)**, **Test Utils (1 self-test file)**

### 10.3 Common Testing Patterns

| Pattern | Details |
|---------|---------|
| **BDD naming** | `#given / #when / #then` comments in ~90% of files |
| **Nesting** | 3-level `describe > describe > it` consistently |
| **Manual mocks** | `mock()` for inline, `mock.module()` for module-level |
| **Factory functions** | Local `make*`/`create*` factories in every complex test file |
| **Temp directories** | `mkdtemp` + `afterEach` cleanup for filesystem tests |
| **Env var isolation** | `XDG_CACHE_HOME`, `GOATCODE_CONFIG_DIR` overrides |
| **No snapshots** | Zero snapshot testing used anywhere |
| **No custom matchers** | Standard `expect` API only |

### 10.4 Shared Test Utilities (`src/test-utils/`)

6 reusable factories:
- `createMockPluginContext()` — minimal `OpenCodeContext`
- `createMockAgentConfig()` — minimal `AgentConfig`
- `createMockToolContext()` — full tool execution context
- `createMockSdkClient()` — mock SDK client with session CRUD
- **16 hook input factories** (`makeToolInput`, `makeChatMessageInput`, etc.)
- **16 hook output factories** (matching shapes)

### 10.5 Critical Untested Areas (High Risk)

| Untested Module | Why It Matters |
|-----------------|----------------|
| `src/plugin/compositor.ts` | **Central plugin composition engine** — all plugins flow through here |
| `src/shared/provider-registry.ts` | Provider management for model resolution |
| `src/shared/provider-discovery.ts` | Auto-discovery of connected providers |
| `src/agents/agent-builder.ts` | Agent construction from configs |
| `src/tools/delegate-task/executor.ts` | Actual sync/async task execution paths |
| `src/hooks/foreground-fallback/handler.ts` | Production error recovery (rate-limit fallback) |
| `src/hooks/model-fallback/handler.ts` | Model fallback selection on failure |
| `src/hooks/runtime-fallback/handler.ts` | Runtime error recovery |
| `src/features/background-agent/event-hook.ts` | Event routing to manager |
| `src/features/background-agent/concurrency.ts` | Per-model concurrency limits |
| `src/features/loops/` | Entire loop system (handler, stores, plugin) |
| `src/features/auto-update/` | Update checking |
| `src/features/prompt-builder/` | Dynamic prompt assembly |

---

## 11. Summary Counts

| Category | Count |
|----------|-------|
| Agents | 7 |
| Tools (GoatCode-registered) | 23 |
| Tools (disabled/planned) | 1 (`skill_mcp`) |
| Hooks | 32 |
| Built-in Skills | 1 (`git-gud`) |
| Task Categories | 8 |
| Features | 6 (background-agent, loops, auto-update, skills, categories, prompt-builder) |
| Config Fields | 11 top-level |
| CLI Commands | 2 |
| Existing Test Files | 32 |
| Estimated Module Coverage | ~60-65% |
