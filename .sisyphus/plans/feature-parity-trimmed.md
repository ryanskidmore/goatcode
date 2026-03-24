# GoatCode Feature Parity Plan (Trimmed)

## TL;DR

> **Quick Summary**: Bring GoatCode to production feature parity with oh-my-openagent across core capability areas: config system, session persistence, background robustness, lifecycle hooks, context injection, tool depth, TUI enhancements, prompt quality, skills, and comprehensive testing.
>
> **Deliverables**:
> - Multi-level config system (user + project + defaults) with JSONC support
> - Persistent session state with crash recovery
> - Robust background agent manager (circuit breaker, error classification, loop detection)
> - ~16 new lifecycle hooks across continuation, quality, and session tiers
> - Enhanced tool implementations (delegate-task, hashline-edit, grep, look-at, background-output)
> - Enhanced TUI doctor command with 15 checks
> - Production-quality agent prompts (replacing 1-line boilerplate with 100-500+ LOC prompts)
> - Built-in skills (frontend-ui-ux) + skill wiring fix
> - Comprehensive test suite (unit + core + E2E)
>
> **Estimated Effort**: L (55 implementation tasks + 4 verification tasks)
> **Parallel Execution**: YES — 8 waves + FINAL
> **Critical Path**: Wave 1 → Wave 2 → Wave 3 → Wave 4 → Wave 5-6 → Wave 7 → FINAL

### Removed Features (see feature-removal-analysis.md)
12 low-value tasks removed (~18% reduction):
- Model restriction hooks (Tasks 38+38b) — OMO-specific model opinions
- question-label-truncator (Task 31) — cosmetic
- todo-description-override (Task 34) — internal metadata
- auto-update-checker hook (Task 26) — redundant with existing feature
- read-image-resizer (Task 36) — niche
- prometheus-md-only (Task 32) — over-restrictive
- slashcommand tool (Task 46) — redundant discovery
- non-interactive-env hook (Task 35) — over-engineered
- TUI @clack/prompts rewrite (Task 48) — cosmetic polish, adds dependency
- TUI run command (Task 50) — niche CI/CD
- call_goat_agent tool (Task 39) — redundant with delegate-task

---

## Context

### Original Request
Achieve enterprise-grade feature parity between GoatCode and oh-my-openagent across user-selected capability gaps. Emphasis on engineering quality, prompt quality beyond boilerplate, and comprehensive testing.

### Key Decisions
- User selected gaps 1, 2, 3, 4, 6 (context-injector only), 7, 9, 11, 13, 14
- Excluded: MCP system, provider expansion, Claude Code compatibility
- Skills: git-master (exists), frontend-ui-ux (add). Excluded: playwright, dev-browser, agent-browser
- Clean-room reimplementation — NO code copied from deps/oh-my-openagent/

### Current State
- GoatCode: 394 TS files, ~18K LOC, 11 agents, 26 tools, 30 hooks
- Dynamic prompt builder ALREADY EXISTS (6 files) — gap is enhancement
- All 9 slash commands ALREADY EXIST — gap is prompt quality
- Agent prompts are ALL 1-line boilerplate — OMO agents have 100-559 LOC prompts
- Skill handler has wiring placeholder — needs bootstrap fix
- git-master skill exists (109 LOC) — need frontend-ui-ux only

---

## Work Objectives

### Definition of Done
- [ ] `bun test` exits 0 — all tests pass
- [ ] `bun run typecheck` exits 0 — no type errors
- [ ] `bun run build` produces valid dist/index.js and dist/index.d.ts
- [ ] All hooks registered in builtin-hooks.ts
- [ ] All tools registered in builtin-tools.ts
- [ ] README.md counts match actual registered plugins
- [ ] Existing goatcode.config.ts files continue to work (backward compat)

### Must NOT Have (Guardrails)
- NO MCP integration
- NO Claude Code compatibility features
- NO catch-all files (utils.ts, helpers.ts, service.ts)
- NO files > 200 LOC (excluding prompt string content)
- NO `as any`, `@ts-ignore`, empty catches, console.log in production
- NO code lifting from deps/oh-my-openagent/ — clean-room only
- NO breaking changes to existing config format

---

## Execution Strategy — Wave Structure

```
Wave 1a (Foundation — 5 parallel tasks):
├── Task 1:  Fix skill tool wiring in bootstrap [quick]
├── Task 2:  Config — JSONC parser + user-level config directory [unspecified-high]
├── Task 4:  Config — Expand schema for feature-specific sections [quick]
├── Task 5:  Context-injector — Enhance agents-injector for write/edit tools [unspecified-high]
└── Task 6:  Context-injector — Enhance readme-injector with hierarchical walking [unspecified-high]

Wave 1b (Foundation — 3 sequential tasks):
├── Task 3:  Config — Multi-level merge (depends: T2) [unspecified-high]
├── Task 7:  Session — Disk persistence with atomic writes (depends: T2,T3) [unspecified-high]
└── Task 8:  Session — Recovery from corrupt/missing state (depends: T7) [unspecified-high]

Wave 2 (Core Infrastructure — 8 parallel tasks):
├── Task 9:  Session — Model state tracking + category registry [unspecified-high]
├── Task 10: Background — Circuit breaker [deep]
├── Task 11: Background — Error classifier [deep]
├── Task 12: Background — Loop detector [deep]
├── Task 13: Background — Task history + staleness detection [unspecified-high]
├── Task 14: Background — Spawn limits + process cleanup [unspecified-high]
├── Task 15: Dynamic prompt — Enhance with tool descriptions [quick]
└── Task 16: Test infrastructure — Hook lifecycle mocking utilities [unspecified-high]

Wave 3 (Hooks — Continuation & Orchestration — 7 parallel tasks):
├── Task 17: todo-continuation-enforcer hook [deep]
├── Task 18: atlas hook (boulder mechanism orchestrator) [deep]
├── Task 19: ralph-loop hook [unspecified-high]
├── Task 20: compaction-context-injector hook [unspecified-high]
├── Task 21: start-work hook [unspecified-high]
├── Task 22: unstable-agent-babysitter hook [deep]
└── Task 23: stop-continuation-guard enhancement [quick]

Wave 4 (Hooks — Quality, Session & Remaining — 8 parallel tasks):
├── Task 24: anthropic-context-window-limit-recovery hook [deep]
├── Task 25: background-notification hook [unspecified-high]
├── Task 27: auto-slash-command hook [unspecified-high]
├── Task 28: category-skill-reminder hook [quick]
├── Task 29: agent-usage-reminder hook [quick]
├── Task 30: task-reminder hook [quick]
├── Task 33: sisyphus-junior-notepad hook [unspecified-high]
└── Task 37: interactive-bash-session hook [unspecified-high]

Wave 5 (Tool Depth + Skills — 7 parallel tasks):
├── Task 40: Tool — Enhance delegate-task (sync execution + token limiter) [deep]
├── Task 41: Tool — Enhance delegate-task (unstable agent handling) [unspecified-high]
├── Task 42: Tool — Enhance hashline-edit (autocorrect + dedup) [unspecified-high]
├── Task 43: Tool — Enhance grep (advanced params + timeout) [unspecified-high]
├── Task 44: Tool — Enhance look-at (multimodal metadata + MIME) [unspecified-high]
├── Task 45: Tool — Enhance background-output (full session format) [unspecified-high]
└── Task 47: Skill — Add frontend-ui-ux builtin skill [quick]

Wave 6 (TUI + Prompt Quality — 6 parallel tasks):
├── Task 49: TUI — Enhance doctor (15 checks, 4 categories) [unspecified-high]
├── Task 51: Prompts — Orchestrator + Atlas (orchestration prompts) [writing]
├── Task 52: Prompts — Deep-worker + Executor + Worker (execution prompts) [writing]
├── Task 53: Prompts — Plan-builder + Analyst + Reviewer (analysis prompts) [writing]
├── Task 54: Prompts — Explorer + Researcher + Advisor + Inspector (specialist prompts) [writing]
└── Task 55: Prompts — Enhance all 9 command templates [writing]

Wave 7 (Testing — 8 parallel tasks):
├── Task 56: Tests — Hook plugin unit tests batch 1 (context/recovery hooks) [unspecified-high]
├── Task 57: Tests — Hook plugin unit tests batch 2 (continuation/quality hooks) [unspecified-high]
├── Task 58: Tests — Hook plugin unit tests batch 3 (remaining hooks) [unspecified-high]
├── Task 59: Tests — Tool plugin unit tests (all enhanced tools) [unspecified-high]
├── Task 60: Tests — Core system tests (registry, compositor, bootstrap, config) [deep]
├── Task 61: Tests — Feature module tests (session, background, skills, commands) [deep]
├── Task 62: Tests — E2E integration tests (full plugin lifecycle) [deep]
└── Task 63: Tests — README accuracy update + final typecheck/build verification [quick]

Wave FINAL (Verification — 4 parallel):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real QA testing (unspecified-high)
└── F4: Scope fidelity check (deep)
```

### Dependency Matrix

- **T1**: — → T47 (skill wiring needed before skills)
- **T2-3**: — → T4, T7-8 (config needed before session persistence)
- **T4**: T2-3 → T10-14 (schema sections for feature configs)
- **T5-6**: — → T17-37 (context-injector pattern for hooks)
- **T7-8**: T2-3 → T9, T13 (persistence for session/task history)
- **T9**: T7-8 → T17-37 (session model state for hooks)
- **T10-14**: T4 → T22, T24-25 (background robustness for hooks)
- **T15**: — → T51-55 (prompt structure)
- **T16**: — → T17-37, T56-58 (mock infra for hooks)
- **T17-23**: T5-6, T9, T16 → T56 (hooks batch 1)
- **T24-30,33,37**: T10-14, T16 → T57-58 (hooks batch 2-3)
- **T40-47**: T1, T10-14 → T59 (tools + skills)
- **T49**: T2-3 → T63 (TUI needs config)
- **T51-55**: T15 → T63 (prompts)
- **T56-63**: T17-55 → FINAL
- **F1-F4**: T56-63 → user okay

---

## Task Details

### Wave 1a: Foundation

#### Task 1: Fix skill tool wiring in bootstrap [quick]
**What**: In `src/bootstrap.ts`, wire `registerSkillLoader()` with `createProjectSkillLoader(projectDirectory)`. Wire builtin skills from `src/features/skills/builtin/`. Remove placeholder in handler.ts line 20.
**Refs**: `src/tools/skill/handler.ts:10-21`, `src/features/skills/skill-loader.ts:95-103`, `src/features/skills/builtin/git-master.ts`
**Tests**: Builtin skill loads, project skill loads, unknown skill returns error
**Accept**: `bun test src/tools/skill/ src/features/skills/` → PASS
**Commit**: `feat(skills): wire skill loader in bootstrap and remove placeholder`

#### Task 2: Config — JSONC parser + user-level config directory [unspecified-high]
**What**: Create `src/config/jsonc-parser.ts` (parse JSON with comments/trailing commas), `src/config/user-config-loader.ts` (~/.config/goatcode/goatcode.jsonc), `src/config/project-config-loader.ts` (.goatcode/goatcode.jsonc). Validate with existing Zod schema. Handle missing files gracefully.
**Refs**: `src/config/loader.ts`, `src/config/schema.ts`, `deps/oh-my-openagent/src/plugin-config.ts`
**Must NOT**: Remove support for goatcode.config.ts. Add external dependencies.
**Accept**: `bun test src/config/` → PASS
**Commit**: `feat(config): add JSONC parser and user/project config loaders`

#### Task 4: Config — Expand schema for feature-specific sections [quick]
**What**: Expand `src/config/schema.ts` to ~15 fields: add `background_task` (concurrency limits), `session` (persistence path, TTL), `comment_checker` (patterns), `notification` (enabled/disabled), `ralph_loop` (max iterations), `dynamic_context_pruning` (token limits). Each section is Zod object with `.default()`. Update `GoatCodeConfig` type and `src/config/defaults.ts`.
**Refs**: `src/config/schema.ts` (58 lines, 6 fields), `src/types/config.ts`
**Accept**: `bun test src/config/` → PASS, `bun run typecheck` → 0 errors
**Commit**: `feat(config): expand schema with feature-specific config sections`

#### Task 5: Context-injector — Enhance agents-injector for write/edit tools [unspecified-high]
**What**: Existing `src/hooks/agents-injector/handler.ts` only triggers on `read` tool. Enhance to also trigger on `write`, `edit`, `hashline_edit`. Add configurable max depth (default 5).
**Refs**: `src/hooks/agents-injector/handler.ts:57` (tool name check), `deps/oh-my-openagent/src/hooks/directory-agents-injector/`
**Must NOT**: Create separate directory — enhance existing hook. Break existing read behavior.
**Accept**: `bun test src/hooks/agents-injector/` → PASS (≥5 tests)
**Commit**: `feat(hooks): enhance agents-injector to cover write/edit tools`

#### Task 6: Context-injector — Enhance readme-injector with hierarchical walking [unspecified-high]
**What**: Existing handler only checks immediate directory. Enhance to walk parent dirs up to workspace root (matching agents-injector pattern). Extend to trigger on write/edit tools.
**Refs**: `src/hooks/readme-injector/handler.ts:40`, `src/hooks/agents-injector/handler.ts:26-49`
**Must NOT**: Create separate directory — enhance existing hook.
**Accept**: `bun test src/hooks/readme-injector/` → PASS (≥5 tests)
**Commit**: `feat(hooks): enhance readme-injector with hierarchical directory walking`

### Wave 1b: Foundation (sequential)

#### Task 3: Config — Multi-level merge with priority resolution [unspecified-high]
**Depends**: Task 2
**What**: Create `src/config/config-merger.ts`. Priority: TS config > project JSONC > user JSONC > defaults. Deep merge for agents/categories. Set union for disabled_* arrays. Scalar override. Update `src/config/loader.ts` to orchestrate loading.
**Refs**: `src/config/loader.ts`, `src/config/defaults.ts`, `deps/oh-my-openagent/src/plugin-config.ts`
**Must NOT**: Change GoatCodeConfig type interface. Break existing TS-only loading.
**Accept**: `bun test src/config/config-merger.test.ts` → PASS (≥8 tests)
**Commit**: `feat(config): add multi-level config merge with priority resolution`

#### Task 7: Session — Disk persistence with atomic writes [unspecified-high]
**Depends**: Tasks 2-3
**What**: Create `src/features/session-state/session-persistence.ts`. Store at `~/.config/goatcode/sessions/{sessionId}.json`. Atomic: write .tmp → rename. Create `session-directory.ts` for directory management. Update `session-store.ts` to persist on state change, load on startup.
**Refs**: `src/features/session-state/session-store.ts`, `deps/oh-my-openagent/src/shared/session-directory-resolver.ts`
**Must NOT**: Use SQLite. Store message content (only metadata).
**Accept**: `bun test src/features/session-state/` → PASS
**Commit**: `feat(session): add disk persistence with atomic writes`

#### Task 8: Session — Recovery from corrupt/missing state [unspecified-high]
**Depends**: Task 7
**What**: Create `src/features/session-state/session-recovery.ts`. On corrupt JSON: log warning, archive to .corrupt, create fresh. On missing: return undefined. Add integrity check. Add TTL cleanup (default 7 days). Update session-recovery hook.
**Refs**: `src/features/session-state/session-persistence.ts`, `src/hooks/session-recovery/`
**Must NOT**: Silently drop data. Delete sessions without TTL.
**Accept**: `bun test src/features/session-state/session-recovery.test.ts` → PASS (≥4 tests)
**Commit**: `feat(session): add recovery from corrupt/missing state with TTL cleanup`

### Wave 2: Core Infrastructure

#### Task 9: Session — Model state tracking + category registry [unspecified-high]
**What**: Create `session-model-state.ts` (track model changes) and `session-category-registry.ts` (track categories per session). Persist to session state file.
**Refs**: `src/features/session-state/session-store.ts`, `deps/oh-my-openagent/src/shared/session-model-state.ts`
**Accept**: `bun test src/features/session-state/` → PASS
**Commit**: `feat(session): add model state tracking and category registry`

#### Task 10: Background — Circuit breaker [deep]
**What**: Create `src/features/background-agent/circuit-breaker.ts`. States: CLOSED → OPEN → HALF_OPEN. Configurable: failure threshold (3), reset timeout (60s). Track per model/provider. Integrate into manager.ts.
**Refs**: `src/features/background-agent/manager.ts`, `deps/oh-my-openagent/src/features/background-agent/manager.ts`
**Accept**: `bun test src/features/background-agent/circuit-breaker.test.ts` → PASS (≥5 tests)
**Commit**: `feat(background): add circuit breaker for background agent manager`

#### Task 11: Background — Error classifier [deep]
**What**: Create `error-classifier.ts`. Categories: transient (retry), permanent (fail), rate_limit (backoff), context_window (compact), auth (stop provider). Pattern match on messages/status codes. Integrate into manager error path.
**Refs**: `src/features/background-agent/manager.ts`, `deps/oh-my-openagent/src/features/background-agent/error-classifier.ts`
**Accept**: `bun test src/features/background-agent/error-classifier.test.ts` → PASS (≥6 tests)
**Commit**: `feat(background): add error classifier for intelligent error recovery`

#### Task 12: Background — Loop detector [deep]
**What**: Create `loop-detector.ts`. Methods: exact match, similarity threshold (>90%), action repetition. Configurable: window (5), threshold (0.9), max identical (3). Cancel task on detection. Integrate into manager.
**Refs**: `src/features/background-agent/manager.ts`, `deps/oh-my-openagent/src/features/background-agent/loop-detector.ts`
**Accept**: `bun test src/features/background-agent/loop-detector.test.ts` → PASS (≥4 tests)
**Commit**: `feat(background): add loop detector for infinite loop prevention`

#### Task 13: Background — Task history + staleness detection [unspecified-high]
**What**: Create `task-history.ts` — persist to disk. Track: taskId, agent, model, category, status, timing, error. Category-specific stale timeouts (quick: 2min, deep: 10min). Add eviction.
**Refs**: `src/features/background-agent/manager.ts`, `deps/oh-my-openagent/src/features/background-agent/task-history.ts`
**Accept**: `bun test src/features/background-agent/task-history.test.ts` → PASS (≥3 tests)
**Commit**: `feat(background): add task history persistence and enhanced staleness detection`

#### Task 14: Background — Spawn limits + process cleanup [unspecified-high]
**What**: Create `spawn-limiter.ts` (system limit 15, queue excess). Create `process-cleanup.ts` (SIGINT/SIGTERM handler: cancel tasks, flush history, close sessions). Integrate into manager.
**Refs**: `src/features/background-agent/concurrency.ts`, `deps/oh-my-openagent/src/features/background-agent/`
**Accept**: `bun test src/features/background-agent/spawn-limiter.test.ts` + `process-cleanup.test.ts` → PASS
**Commit**: `feat(background): add global spawn limits and process cleanup handlers`

#### Task 15: Dynamic prompt — Enhance with tool descriptions [quick]
**What**: Create `src/features/prompt-builder/tool-section-builder.ts`. Update `DynamicPromptInput` to accept tools. Generate tool descriptions table in orchestrator prompt.
**Refs**: `src/features/prompt-builder/dynamic-prompt-builder.ts`, `src/features/prompt-builder/agent-table-builder.ts`
**Accept**: `bun test src/features/prompt-builder/` → PASS
**Commit**: `feat(prompt-builder): add tool descriptions section to dynamic prompt`

#### Task 16: Test infrastructure — Hook lifecycle mocking [unspecified-high]
**What**: Create `src/test-utils/mock-hook-context.ts`, `mock-session-state.ts`, `hook-test-harness.ts`. Support all 16 hook event types. Clean reset between tests.
**Refs**: `src/test-utils/mock-plugin-context.ts`, `test-setup.ts`
**Accept**: `bun test src/test-utils/` → PASS
**Commit**: `test(utils): add hook lifecycle mocking and test harness utilities`

### Wave 3: Hooks — Continuation & Orchestration

> **Standard for ALL hooks**: Follow plugin pattern at `src/hooks/{name}/plugin.ts` + `handler.ts` + `types.ts`. Register in `src/hooks/builtin-hooks.ts`. Map to one of 16 HookEventName types. Include ≥3 unit tests. Reference OMO for behavior spec, write clean-room.

#### Task 17: todo-continuation-enforcer hook [deep]
**What**: Create `src/hooks/todo-continuation-enforcer/` — when agent goes idle with incomplete todos, inject continuation prompt after 2s delay. Configurable enable/disable, delay, max attempts.
**Event**: `chat.message`
**Refs**: `deps/oh-my-openagent/src/hooks/todo-continuation-enforcer/` (2061 LOC), `src/hooks/stop-guard/`
**Commit**: `feat(hooks): add todo-continuation-enforcer hook (boulder mechanism)`

#### Task 18: atlas hook [deep]
**What**: Create `src/hooks/atlas/` — master todo-list orchestrator. Manages boulder mechanism, background task coordination, work session lifecycle. Integrates with `src/features/boulder-state/`.
**Event**: `chat.message` + `event`
**Refs**: `deps/oh-my-openagent/src/hooks/atlas/` (1976 LOC), `src/features/boulder-state/`
**Commit**: `feat(hooks): add atlas hook for boulder mechanism orchestration`

#### Task 19: ralph-loop hook [unspecified-high]
**What**: Create `src/hooks/ralph-loop/` — detect completion promise, manage iteration count, inject continuation messages. Integrates with `src/features/loops/ralph-loop/`.
**Event**: `chat.message`
**Refs**: `deps/oh-my-openagent/src/hooks/ralph-loop/` (1687 LOC), `src/features/loops/ralph-loop/`
**Commit**: `feat(hooks): add ralph-loop hook for continuation mechanism`

#### Task 20: compaction-context-injector hook [unspecified-high]
**What**: Create `src/hooks/compaction-context-injector/` — re-inject critical context after compaction (AGENTS.md, task state, model info). Complements existing compaction hooks.
**Event**: `experimental.session.compacting`
**Refs**: `src/hooks/compaction-context/`, `deps/oh-my-openagent/src/hooks/compaction-context-injector/`
**Commit**: `feat(hooks): add compaction-context-injector for post-compaction context recovery`

#### Task 21: start-work hook [unspecified-high]
**What**: Create `src/hooks/start-work/` — detect /start-work invocation, set up boulder session, load plan file, configure continuation.
**Event**: `chat.message`
**Refs**: `src/features/slash-commands/commands/start-work.ts`, `deps/oh-my-openagent/src/hooks/start-work/`
**Commit**: `feat(hooks): add start-work hook for boulder session initialization`

#### Task 22: unstable-agent-babysitter hook [deep]
**What**: Create `src/hooks/unstable-agent-babysitter/` — monitor for rapid failures, empty responses, repeated errors. Actions: log, switch model, cancel if unrecoverable. Uses circuit breaker from T10.
**Event**: `event`
**Refs**: `deps/oh-my-openagent/src/hooks/unstable-agent-babysitter/`, `src/features/background-agent/circuit-breaker.ts`
**Commit**: `feat(hooks): add unstable-agent-babysitter for health monitoring`

#### Task 23: stop-continuation-guard enhancement [quick]
**What**: Enhance existing `src/hooks/stop-guard/` to halt ALL continuation mechanisms: ralph loop, todo continuation, boulder, atlas. Add tests for interaction with new hooks.
**Event**: `chat.message`
**Refs**: `src/hooks/stop-guard/`, `deps/oh-my-openagent/src/hooks/stop-continuation-guard/`
**Commit**: `feat(hooks): enhance stop-guard to halt all continuation mechanisms`

### Wave 4: Hooks — Quality, Session & Remaining

#### Task 24: anthropic-context-window-limit-recovery hook [deep]
**What**: Create multi-strategy recovery: 1) truncate oldest, 2) trigger compaction, 3) summarize+replace, 4) fresh session. Each strategy is separate function.
**Event**: `event`
**Refs**: `deps/oh-my-openagent/src/hooks/anthropic-context-window-limit-recovery/` (2232 LOC), `src/hooks/context-window-limit/`
**Commit**: `feat(hooks): add anthropic-context-window-limit-recovery with multi-strategy recovery`

#### Task 25: background-notification hook [unspecified-high]
**What**: Create `src/hooks/background-notification/` — notify when background tasks complete. Inject system message with task status, duration, errors.
**Event**: `event`
**Refs**: `deps/oh-my-openagent/src/hooks/background-notification/`
**Commit**: `feat(hooks): add background-notification for task completion alerts`

#### Task 27: auto-slash-command hook [unspecified-high]
**What**: Create `src/hooks/auto-slash-command/` — scan messages for /command patterns, route to registered commands.
**Event**: `chat.message`
**Refs**: `src/features/slash-commands/command-registry.ts`, `deps/oh-my-openagent/src/hooks/auto-slash-command/`
**Commit**: `feat(hooks): add auto-slash-command for automatic command detection`

#### Task 28: category-skill-reminder hook [quick]
**What**: Create `src/hooks/category-skill-reminder/` — remind agents about available skills for their category.
**Event**: `chat.message`
**Refs**: `deps/oh-my-openagent/src/hooks/category-skill-reminder/`
**Commit**: `feat(hooks): add category-skill-reminder for skill awareness`

#### Task 29: agent-usage-reminder hook [quick]
**What**: Create `src/hooks/agent-usage-reminder/` — periodically remind orchestrator about available specialist agents.
**Event**: `chat.message`
**Refs**: `deps/oh-my-openagent/src/hooks/agent-usage-reminder/`
**Commit**: `feat(hooks): add agent-usage-reminder for specialist agent awareness`

#### Task 30: task-reminder hook [quick]
**What**: Create `src/hooks/task-reminder/` — inject reminder about background tasks that completed since last check.
**Event**: `chat.message`
**Refs**: `deps/oh-my-openagent/src/hooks/task-reminder/`
**Commit**: `feat(hooks): add task-reminder for active task awareness`

#### Task 33: sisyphus-junior-notepad hook [unspecified-high]
**What**: Create `src/hooks/sisyphus-junior-notepad/` — inject parent task context and notes into subagent sessions.
**Event**: `chat.message`
**Refs**: `deps/oh-my-openagent/src/hooks/sisyphus-junior-notepad/`
**Commit**: `feat(hooks): add sisyphus-junior-notepad for subagent context`

#### Task 37: interactive-bash-session hook [unspecified-high]
**What**: Create `src/hooks/interactive-bash-session/` — set up and tear down tmux sessions for interactive terminal use.
**Event**: `tool.execute.before` + `tool.execute.after`
**Refs**: `deps/oh-my-openagent/src/hooks/interactive-bash-session/`
**Commit**: `feat(hooks): add interactive-bash-session for tmux lifecycle management`

### Wave 5: Tool Depth + Skills

#### Task 40: Enhance delegate-task — sync execution + token limiter [deep]
**What**: Add sync mode (wait for completion when run_in_background=false). Add token limiting per category. Create `sync-executor.ts` and `token-limiter.ts`.
**Refs**: `src/tools/delegate-task/handler.ts`, `deps/oh-my-openagent/src/tools/delegate-task/sync-task.ts`
**Accept**: `bun test src/tools/delegate-task/` → PASS
**Commit**: `feat(tools): add sync execution and token limiting to delegate-task`

#### Task 41: Enhance delegate-task — unstable agent handling [unspecified-high]
**What**: Create `unstable-agent-handler.ts` — detect unstable agents (repeated failures), retry with different model, fall back to alternative category. Integrate with circuit breaker.
**Refs**: `deps/oh-my-openagent/src/tools/delegate-task/unstable-agent-task.ts`
**Accept**: `bun test src/tools/delegate-task/` → PASS
**Commit**: `feat(tools): add unstable agent handling to delegate-task`

#### Task 42: Enhance hashline-edit — autocorrect + dedup [unspecified-high]
**What**: Create `autocorrect-replacements.ts` (fix wrong whitespace, off-by-one hashes) and `edit-deduplication.ts` (detect/skip duplicate edits).
**Refs**: `src/tools/hashline-edit/handler.ts`, `deps/oh-my-openagent/src/tools/hashline-edit/autocorrect-replacement-lines.ts`
**Accept**: `bun test src/tools/hashline-edit/` → PASS
**Commit**: `feat(tools): add autocorrect and deduplication to hashline-edit`

#### Task 43: Enhance grep — advanced params + timeout [unspecified-high]
**What**: Add params: head_limit, context, include, output_mode, max_file_size. Add 60s timeout, 10MB output limit.
**Refs**: `src/tools/grep/handler.ts`, `src/tools/grep/types.ts`, `deps/oh-my-openagent/src/tools/grep/types.ts`
**Accept**: `bun test src/tools/grep/` → PASS
**Commit**: `feat(tools): expand grep parameters and add timeout handling`

#### Task 44: Enhance look-at — multimodal metadata + MIME [unspecified-high]
**What**: Create `mime-type-inference.ts` and `multimodal-metadata.ts`. Route by MIME type: images→vision, PDFs→text extraction, text→direct read.
**Refs**: `src/tools/look-at/handler.ts`, `deps/oh-my-openagent/src/tools/look-at/multimodal-agent-metadata.ts`
**Accept**: `bun test src/tools/look-at/` → PASS
**Commit**: `feat(tools): add MIME type inference and multimodal metadata to look-at`

#### Task 45: Enhance background-output — full session format [unspecified-high]
**What**: Create `full-session-format.ts`. Add `full_session` and `since_message_id` parameters.
**Refs**: `src/tools/background-task/`, `deps/oh-my-openagent/src/tools/background-task/full-session-format.ts`
**Accept**: `bun test src/tools/background-task/` → PASS
**Commit**: `feat(tools): add full session format to background-output`

#### Task 47: Skill — Add frontend-ui-ux builtin skill [quick]
**Depends**: Task 1 (skill wiring)
**What**: Create `src/features/skills/builtin/frontend-ui-ux.ts` — design principles, component patterns, accessibility, responsive design, CSS best practices. Follow git-master.ts pattern.
**Refs**: `src/features/skills/builtin/git-master.ts` (109 LOC), `deps/oh-my-openagent/src/features/builtin-skills/skills/frontend-ui-ux.ts`
**Accept**: `bun test src/features/skills/` → PASS
**Commit**: `feat(skills): add frontend-ui-ux builtin skill`

### Wave 6: TUI + Prompt Quality

#### Task 49: TUI — Enhance doctor (15 checks, 4 categories) [unspecified-high]
**What**: Expand doctor to 15+ checks: System (Bun/Node versions, OpenCode), Config (config files, schema), Tools (tmux, git, ripgrep), Models (provider configured). Use picocolors for output.
**Refs**: `src/cli/commands/doctor.ts`, `deps/oh-my-openagent/src/cli/doctor/`
**Accept**: `bun src/cli/index.ts doctor` runs with categorized output
**Commit**: `feat(cli): enhance doctor command with 15 health checks across 4 categories`

#### Task 51: Prompts — Orchestrator + Atlas [writing]
**What**: Rewrite `src/agents/orchestrator/prompt.ts` from 1-line to 200-500 LOC. Include: delegation strategy, intent classification, parallel execution, category routing, tool guidelines, anti-patterns, verification, continuation protocol.
**Refs**: `src/agents/orchestrator/prompt.ts`, `deps/oh-my-openagent/src/agents/sisyphus.ts` (559 LOC)
**Accept**: Prompt > 200 LOC, includes delegation/intent/parallel/anti-pattern sections. Typecheck passes.
**Commit**: `feat(agents): production-quality orchestrator prompt`

#### Task 52: Prompts — Deep-worker + Executor + Worker [writing]
**What**: Rewrite all 3 execution agent prompts from 1-line to 100+ LOC each. Deep-worker: exploration-first, research-before-act. Executor: plan-following, status tracking. Worker: category awareness, skill usage.
**Refs**: `deps/oh-my-openagent/src/agents/builtin-agents/hephaestus-agent.ts`
**Accept**: Each > 100 LOC. Typecheck passes.
**Commit**: `feat(agents): production-quality execution agent prompts`

#### Task 53: Prompts — Plan-builder + Analyst + Reviewer [writing]
**What**: Rewrite all 3 analysis agent prompts. Plan-builder: interview protocol, scope definition. Analyst: verification checklists, edge cases. Reviewer: requirement matching, quality criteria.
**Accept**: Each > 100 LOC. Typecheck passes.
**Commit**: `feat(agents): production-quality analysis agent prompts`

#### Task 54: Prompts — Explorer + Researcher + Advisor + Inspector [writing]
**What**: Rewrite all 4 specialist prompts. Explorer: parallel search, tool selection. Researcher: search strategies, source evaluation. Advisor: analysis framework, debugging. Inspector: image analysis, PDF extraction.
**Accept**: Each > 50 LOC. Typecheck passes.
**Commit**: `feat(agents): production-quality specialist agent prompts`

#### Task 55: Prompts — Enhance all 9 command templates [writing]
**What**: Review and enhance all 9 templates in `src/features/slash-commands/commands/`. Add detailed instructions, step-by-step protocols, error handling, exit conditions.
**Refs**: `src/features/slash-commands/commands/`, `deps/oh-my-openagent/src/features/builtin-commands/templates/`
**Accept**: Each template > 50 LOC. `bun test src/features/slash-commands/` → PASS
**Commit**: `feat(commands): enhance all 9 slash command templates to production quality`

### Wave 7: Testing

#### Task 56: Hook unit tests batch 1 — context/recovery hooks [unspecified-high]
**What**: Tests for: agents-injector (enhanced), readme-injector (enhanced), compaction-context-injector (new), anthropic-context-window-limit-recovery (new), background-notification (new). ≥3 tests per hook.
**Accept**: All listed hook test suites → PASS
**Commit**: `test(hooks): comprehensive unit tests for context and recovery hooks`

#### Task 57: Hook unit tests batch 2 — continuation/quality hooks [unspecified-high]
**What**: Tests for: todo-continuation-enforcer, atlas, ralph-loop, start-work, unstable-agent-babysitter, stop-guard (enhanced), auto-slash-command, category-skill-reminder, agent-usage-reminder, task-reminder. ≥3 tests per hook.
**Accept**: All listed hook test suites → PASS
**Commit**: `test(hooks): comprehensive unit tests for continuation and quality hooks`

#### Task 58: Hook unit tests batch 3 — remaining hooks [unspecified-high]
**What**: Tests for: sisyphus-junior-notepad, interactive-bash-session. ≥3 tests per hook.
**Accept**: All listed hook test suites → PASS
**Commit**: `test(hooks): comprehensive unit tests for remaining hooks`

#### Task 59: Tool plugin unit tests [unspecified-high]
**What**: Tests for: delegate-task (enhanced), hashline-edit (enhanced), grep (enhanced), look-at (enhanced), background-output (enhanced), skill. ≥3 tests per tool covering new functionality.
**Accept**: `bun test src/tools/` → ALL PASS
**Commit**: `test(tools): comprehensive unit tests for all tool plugins`

#### Task 60: Core system tests [deep]
**What**: Tests for: plugin-registry (dependency resolution, aggregation), compositor (hook composition), bootstrap (full init), config (JSONC, merge, backward compat, schema). ≥5 tests per module.
**Accept**: `bun test src/registry/ src/plugin/ src/config/` → ALL PASS
**Commit**: `test(core): comprehensive tests for registry, compositor, and config`

#### Task 61: Feature module tests [deep]
**What**: Tests for: session-state (persistence, recovery, model tracking), background-agent (circuit breaker, error classifier, loop detector, task history, spawn limits), skills (loader, merger, builtins), slash-commands (all 9). ≥5 per module.
**Accept**: `bun test src/features/` → ALL PASS
**Commit**: `test(features): comprehensive tests for all feature modules`

#### Task 62: E2E integration tests [deep]
**What**: Create `tests/e2e/` — full bootstrap lifecycle, hook execution chain, agent resolution, config priority, disabled plugins.
**Accept**: `bun test tests/e2e/` → ALL PASS
**Commit**: `test(e2e): full plugin lifecycle integration tests`

#### Task 63: README accuracy + final build verification [quick]
**What**: Update README.md counts. Run `bun run typecheck && bun test && bun run build`. Verify dist output.
**Accept**: All verification commands exit 0. README matches reality.
**Commit**: `chore: update README counts and verify full build pipeline`

### Wave FINAL: Verification

#### F1: Plan compliance audit (oracle)
Compare every Must Have / Must NOT Have against codebase. Check evidence files.

#### F2: Code quality review (unspecified-high)
Run build pipeline. Review architecture. Scan for forbidden patterns.

#### F3: Real manual QA (unspecified-high)
Execute functional tests: config merge, session lifecycle, CLI doctor.

#### F4: Scope fidelity check (deep)
Compare each task spec against actual implementation. Detect contamination.

---

## Commit Strategy

- **Hooks**: `feat(hooks): add {hook-name} hook — {description}`
- **Tools**: `feat(tools): enhance {tool-name} — {description}`
- **Config**: `feat(config): {description}`
- **Session**: `feat(session): {description}`
- **Background**: `feat(background): {description}`
- **TUI**: `feat(cli): {description}`
- **Prompts**: `feat(agents): {agent-name} production prompt`
- **Skills**: `feat(skills): add {skill-name} builtin skill`
- **Tests**: `test({scope}): {description}`

Pre-commit: `bun run typecheck && bun test` (must pass before commit)

---

## Success Criteria

```bash
bun test                     # all src/ tests pass
bun test tests/e2e/          # all E2E tests pass
bun run typecheck            # exit 0
bun run build                # dist/index.js + dist/index.d.ts
bun src/cli/index.ts doctor  # health checks pass
```
