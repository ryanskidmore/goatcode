# GoatCode Test Results

**Date:** 2026-04-11  
**Tester:** Orchestrator (self-executable run)  
**Baseline:** All 923 src tests pass (0 fail) via official npm test script — includes 20 new fix-validation tests in `src/validate-fixes.test.ts`
**Method:** Ran existing test suite + wrote and ran direct scenario-reproduction tests for every fixed bug

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ PASS | Scenario verified correct — covered by passing test or code-confirmed |
| ❌ FAIL | Scenario verified incorrect — bug or missing implementation confirmed |
| ⚠️ KNOWN ISSUE | Documented bug/limitation noted in the scenario itself |
| 🔍 UNTESTED | No test coverage and runtime-only — cannot fully verify statically |
| ℹ️ N/A | Not applicable or superseded |

---

## Progress

- [x] Section 1: Agents (A1–A27) — **26 PASS**, 0 FAIL, 1 UNTESTED *(A22 fixed)*
- [x] Section 2: Tools (T1–T151) — **150 PASS**, 0 FAIL, 0 KNOWN ISSUE, 1 UNTESTED *(T60, T62, T64, T65, T106, T112, T121, T143, T151 all fixed)*
- [x] Section 3: Hooks (H1–H119) — 119 PASS
- [x] Section 4: Features (F1–F59) — **59 PASS**, 0 KNOWN ISSUE *(F15 fixed in PR #46)*
- [x] Section 5: Configuration (C1–C13) — 13 PASS
- [x] Section 6: Plugin Architecture (P1–P11) — 11 PASS
- [x] Section 7: Provider Discovery & Model Resolution (PR1–PR17) — 17 PASS
- [x] Section 8: Delegation System (D1–D8) — 8 PASS
- [x] Section 9: CLI (CL1–CL7) — 7 PASS
- [x] Section 10: Cross-Cutting (X1–X14) — 13 PASS, 1 UNTESTED

---

## Section 1: Agents (A1–A27)

### 1.1 Agent Registration & Plugin Metadata

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| A1 | All 7 agents registered | ✅ PASS | `BUILTIN_AGENT_PLUGINS` contains exactly 7 entries; tested in `agent-plugins.test.ts` (expect length 7) |
| A2 | Agent plugin has name/version | ✅ PASS | All plugins have `version: "0.1.0"` and unique names; tested in `agent-plugins.test.ts` |
| A3 | Disabled agents excluded | ✅ PASS | `aggregateContributions()` uses `disabled Set`; skips matching names; tested in `contribution-aggregator.test.ts` |
| A4 | Unknown agent in disabled list | ✅ PASS | `disabled.has(name)` never matches a nonexistent agent; no error thrown |

### 1.2 Agent Modes

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| A5 | `all` mode agents (orchestrator, deepworker, planner, researcher) | ✅ PASS | Confirmed in config files: `ORCHESTRATOR_MODE="all"`, `DEEP_WORKER_MODE="all"`, `PLANNER_MODE="all"`, `RESEARCHER_MODE="all"` |
| A6 | `subagent` mode agents (advisor, explorer, worker) | ✅ PASS | Confirmed in config files: `ADVISOR_MODE="subagent"`, `EXPLORER_MODE="subagent"`, `WORKER_MODE="subagent"` |
| A7 | `subagent` agents ignore UI model | 🔍 UNTESTED | Mode is set in plugin definition but runtime enforcement is in OpenCode's agent dispatcher, not GoatCode code |

### 1.3 Tool Restrictions

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| A8 | Advisor denied tools | ✅ PASS | `AGENT_TOOL_RESTRICTIONS.advisor.denied` lists `write, edit, bash, interactive_bash, delegate_task, task_create, task_update`; directly tested in `agent-plugins.test.ts` |
| A9 | Advisor allowed tools | ✅ PASS | Advisor uses `denied` list only; `read, grep, glob` not in denied list → allowed |
| A10 | Explorer allowed-only whitelist | ✅ PASS | `AGENT_TOOL_RESTRICTIONS.explorer.allowed` = `[read, glob, grep, lsp_*, ast_grep_search, look_at, todowrite]`; all in source |
| A11 | Explorer denied-by-omission | ✅ PASS | `buildToolsMap` sets all unknown tools to `false` when using allowed list; `write, edit, bash, delegate_task` not in allowed list |
| A12 | Orchestrator full access | ✅ PASS | No entry for `orchestrator` in `AGENT_TOOL_RESTRICTIONS`; `getToolRestrictions` returns `{ denied: [] }` |
| A13 | Config denied_tools override | ✅ PASS | `agent-builder.ts:78-84` merges `overrides.denied_tools` into tools map; tested in `agent-builder.test.ts` |
| A14 | Empty denied_tools | ✅ PASS | `if (overrides.denied_tools?.length)` guard skips empty array |
| A15 | Unknown tool in denied list | ✅ PASS | `tools[nonexistent] = false` is a no-op for unknown keys; no error |

### 1.4 Fallback Chains

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| A16 | First provider connected | ✅ PASS | Orchestrator chain: first entry `providers: ["anthropic", "opencode"]`; when `anthropic` connected → `anthropic/claude-opus-4-6`; tested in `model-resolution.test.ts` |
| A17 | First provider disconnected | ✅ PASS | Falls through to second entry `providers: ["openai", "opencode"]` → `openai/gpt-5.4`; tested |
| A18 | All providers disconnected | ✅ PASS | No chain entry matches → returns `undefined`; tested with `connectedProviders: ["google"]` → `undefined` |
| A19 | First-run (null provider cache) | ✅ PASS | `resolveModel({ connectedProviders: null })` → `undefined`; tested in `model-resolution.test.ts` |
| A20 | Unknown agent fallback chain | ✅ PASS | `getFallbackChain("nonexistent")` returns `[]` per `?? []` fallback in source |
| A21 | `opencode` provider universal fallback | ✅ PASS | `"opencode"` appears in all fallback chain entries; `resolveModel` with only opencode → matches first entry |
| A22 | Config fallback_models override | ✅ PASS | **Fixed** — `buildCustomFallbackChain()` added to `fallback-chains.ts`; `compose()` now accepts `agentOverrides`; compositor reads `fallback_models` and builds custom `FallbackEntry[]`. Validated: custom chain `["openai/gpt-5.4"]` resolves to `openai/gpt-5.4` with no variant (vs default chain which adds `variant:medium`) — proves the custom chain is used. Tests: `validate-fixes.test.ts` A22 (2 tests); `bootstrap.integration.test.ts` A22 block (2 tests) |

### 1.5 Agent Builder

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| A23 | Agent with empty model string | ✅ PASS | `if (!base.model) { base.model = model; }` — empty string is falsy → falls back to default model param |
| A24 | Agent override temperature | ✅ PASS | `agent-builder.ts:58-60` applies `overrides.temperature` when defined; tested in `agent-builder.test.ts` |
| A25 | Agent override prompt_append | ✅ PASS | `appendPrompt(base.prompt, overrides.prompt_append)` appends after base; tested |
| A26 | Agent disable via config | ✅ PASS | `base.disable = overrides.disable` applied when defined |
| A27 | AgentRegistry duplicate register | ✅ PASS | `agent-registry.ts:8-10` logs warning on duplicate and overwrites silently |

---

## Section 2: Tools (T1–T151)

### 2.1 grep

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T1 | Pattern match found | ✅ PASS | Handler returns grep stdout on exitCode 0; tested in `grep/handler.test.ts` |
| T2 | No matches | ✅ PASS | `exitCode === 1` → returns `"No matches found"`; tested |
| T3 | Invalid regex | ✅ PASS | `exitCode !== 0 && !== 1` → returns `"Error: ${errorOutput}"`; grep returns exitCode 2 on invalid regex |
| T4 | Include filter | ✅ PASS | `--include=*.ts` added to command when `args.include` set; tested |
| T5 | Output modes | ✅ PASS | content/files_with_matches/count each set appropriate flags (`--line-number`, `-l`, `-c`); tested |
| T6 | Head limit | ✅ PASS | `applyHeadLimit(output, 5)` slices to 5 lines |
| T7 | Head limit zero | ✅ PASS | `headLimit <= 0` → returns full output |
| T8 | Negative head limit | ✅ PASS | `-1 <= 0` → treated as unlimited |
| T9 | Binary file exclusion | ✅ PASS | `--binary-files=without-match` always in command |
| T10 | Empty pattern | ✅ PASS | grep with `""` matches all lines; returns output or "No matches found" if empty dir |

### 2.2 glob

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T11 | Pattern matches files | ✅ PASS | Returns absolute paths sorted by mtime descending; tested in `glob/handler.test.ts` |
| T12 | No files found | ✅ PASS | Returns `"No files found"` on empty scanner result; tested |
| T13 | 100 file hard cap | ✅ PASS | `files.slice(0, MAX_FILES)` where `MAX_FILES=100`; tested with 105 files → 100 returned |
| T14 | No truncation warning | ✅ PASS | Code uses `slice(0, MAX_FILES)` with no appended warning message |
| T15 | Single stat failure | ✅ PASS | `collectWithMtime` uses `Promise.all` → one `stat()` failure propagates; scenario describes this behavior correctly |
| T16 | Nested glob | ✅ PASS | `new Bun.Glob(pattern)` with `scan({ cwd })` handles `**/*.ts` recursively |
| T17 | Path parameter | ✅ PASS | `resolve(context.directory, args.path)` when `args.path` set |

### 2.3 ast_grep_search

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T18 | Valid pattern match | ✅ PASS | Returns matches with context; tested in `ast-grep/search/handler.test.ts` |
| T19 | No matches | ✅ PASS | Returns appropriate empty message; tested |
| T20 | `sg` binary not found | ✅ PASS | Returns specific "sg not found" message; tested |
| T21 | Invalid language | ✅ PASS | Zod enum validation rejects invalid lang; tested |
| T22 | Empty paths array | ✅ PASS | `(args.paths && args.paths.length > 0)` falsy check → defaults to `["."]`; tested |
| T23 | Custom paths | ✅ PASS | Searches in specified paths only |
| T24 | Context lines | ✅ PASS | `context: 3` passed to sg command; tested |

### 2.4 ast_grep_replace

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T25 | Dry run (default) | ✅ PASS | `dryRun: undefined` → prefixed with `"[DRY RUN]"`; tested in `ast-grep/replace/handler.test.ts` |
| T26 | Dry run explicit true | ✅ PASS | `dryRun: true` → prefixed; tested |
| T27 | Actual replace | ✅ PASS | `dryRun: false` (strict equality check) → files modified, no prefix; tested |
| T28 | No matches to replace | ✅ PASS | Returns `"No matches found to replace"` |

### 2.5 hashline_edit

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T29 | replace_line | ✅ PASS | Tested in `hashline-edit.test.ts` (734 line test file, comprehensive) |
| T30 | replace_range | ✅ PASS | Tested; inclusive range replacement verified |
| T31 | append_at | ✅ PASS | Tested; lines appear after anchor |
| T32 | prepend_at | ✅ PASS | Tested; lines appear before anchor |
| T33 | append_file | ✅ PASS | Tested |
| T34 | prepend_file | ✅ PASS | Tested |
| T35 | Hash mismatch | ✅ PASS | Tested; error with corrective remap suggestions |
| T36 | Overlapping ranges | ✅ PASS | Tested; error detected |
| T37 | Insert inside replaced range | ✅ PASS | Tested; error detected |
| T38 | Empty edits array | ✅ PASS | Tested; error returned |
| T39 | File not found (create mode) | ✅ PASS | Tested; file created for append/prepend_file ops |
| T40 | File not found (edit mode) | ✅ PASS | Tested; error returned for replace_line |
| T41 | Deletion via null lines | ✅ PASS | Tested; lines deleted |
| T42 | String lines split | ✅ PASS | Tested; split by `\n` |
| T43 | Duplicate edits | ✅ PASS | Tested; silently deduplicated |
| T44 | All-noop edits | ✅ PASS | Tested; error returned |
| T45 | Line 0 rejected | ✅ PASS | Tested; validation error |
| T46 | Tolerant parser strips prefixes | ✅ PASS | Tested; `>`, `+`, `-` prefixes stripped |
| T47 | Bottom-up sort | ✅ PASS | Tested; applied bottom-up |
| T48 | Hash alphabet | ✅ PASS | Tested; only `ZPMQVRWSNKTXJBYH` accepted |

### 2.6 LSP Tools

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T49 | goto_definition found | ✅ PASS | Returns `formatLspResult(result)`; tested in `lsp-tools.test.ts` |
| T50 | goto_definition not found | ✅ PASS | Returns `"No definition found"` on null/undefined/empty array; tested |
| T51 | find_references found | ✅ PASS | Returns reference locations; tested |
| T52 | find_references empty array | ✅ PASS | Returns `"No references found"`; tested |
| T53 | symbols document scope | ✅ PASS | Returns document symbols; tested |
| T54 | symbols workspace scope | ✅ PASS | Returns workspace-wide symbols; tested |
| T55 | symbols workspace without query | ✅ PASS | Hand-coded validation rejects; tested |
| T56 | diagnostics with severity filter | ✅ PASS | Tested in `diagnostics/handler.test.ts` |
| T57 | diagnostics with extension | ✅ PASS | Tested |
| T58 | prepare_rename valid | ✅ PASS | Returns rename range; tested |
| T59 | prepare_rename invalid | ✅ PASS | Returns `"Rename is not valid at this position"` on null/undefined; tested |
| T60 | rename with empty newName | ✅ PASS | **Fixed** — `.min(1)` added to `newName` in `rename/types.ts`. Validated: `lspRenameArgsSchema.safeParse({..., newName: ""})` returns `success: false` with issue on `newName` path. `validate-fixes.test.ts` T60 |
| T61 | LSP client unavailable | ✅ PASS | All 5 dispatch strategies exhausted → throws `"LSP client method unavailable: ${toolName}"` |
| T62 | Float line numbers | ✅ PASS | **Fixed** — `.int()` added to `line` and `character` in all 4 LSP tools with position args. Validated: `line: 1.5`, `character: 2.9`, `line: 0.5`, `line: 3.14` each fail Zod parse; integer values still pass. `validate-fixes.test.ts` T62 (5 tests) |
| T63 | Dispatch strategy fallback | ✅ PASS | `callLspClient` tries 5 strategies in sequence; source confirmed |
| T64 | Prepare_rename returns [] | ✅ PASS | **Fixed** — `Array.isArray(result) && result.length === 0` guard added to `prepare-rename/handler.ts`. Validated: mock client returning `{data: []}` now produces `"Rename is not valid at this position"`, not `"[]"`; confirmed result `!== "[]"`). `validate-fixes.test.ts` T64 |
| T65 | `unwrapClientResponse` with `error: 0` | ✅ PASS | **Fixed** — check changed to truthy `if (record.error)`. Validated: mock returning `{error: 0, data: [...]}` returns the data without throwing; mock with `{error: "symbol not found"}` still throws. `validate-fixes.test.ts` T65 (2 tests); `client.test.ts` (7 tests) |

### 2.7 delegate_task

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T66 | Background task launch | ✅ PASS | Returns task_id, status=running; tested in `delegate-task.test.ts` |
| T67 | Sync task execution | ✅ PASS | Returns inline result; tested |
| T68 | Unknown category | ✅ PASS | Returns error with available categories list; tested |
| T69 | Session resume (sync) | ✅ PASS | `session_id` passed to executor resumes existing session |
| T70 | Session resume (background) | ✅ PASS | Returns `"Error: 'session_id' is not supported for background tasks..."`; confirmed in `executor.ts:81` |
| T71 | Depth at limit | ✅ PASS | Returns `"Delegation blocked: maximum depth (2) reached..."`; tested |
| T72 | Depth unknown (API error) | ✅ PASS | Returns `"Delegation blocked: unable to determine current delegation depth."`; source confirmed |
| T73 | Depth 0 (root) | ✅ PASS | Orchestrator session depth=0 → allowed, injects `depth=1` marker; tested |
| T74 | Depth 1 (specialist) | ✅ PASS | Allowed, injects `depth=2` marker; tested |
| T75 | No depth marker found | ✅ PASS | `extractDelegationDepth` returns `0` when no marker; tested |
| T76 | Client unavailable | ✅ PASS | `getClientFromToolContext` throws `Error` when neither tool context nor stored client; tested |
| T77 | Metadata emission timing | ✅ PASS | Both metadata calls emitted; first without sessionId, second with; tested |
| T78 | waitForSessionId timeout | ✅ PASS | Returns `undefined` after timeout; source confirmed |
| T79 | Sync poll timeout | ✅ PASS | Returns timeout message with session ID after `>55s`; tested |
| T80 | Sync stability detection | ✅ PASS | Message count stable for 3 polls → returns last assistant message; tested |
| T81 | Category with prompt_append | ✅ PASS | `buildPromptWithCategoryContext` appends `config.prompt_append`; tested |
| T82 | Empty subagent_type | ✅ PASS | `deriveSubagent` falls back to category name on empty string |

### 2.8 background_output

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T83 | Task completed | ✅ PASS | Returns result; tested in `background-task/output/handler.test.ts` |
| T84 | Task running, no block | ✅ PASS | Returns status immediately; tested |
| T85 | Task running, block until complete | ✅ PASS | Tested with mock completion within timeout |
| T86 | Task running, block timeout | ✅ PASS | Returns current status after timeout; tested |
| T87 | Task not found | ✅ PASS | Returns error message; tested |
| T88 | Task cancelled | ✅ PASS | Returns `"Task was cancelled"`; tested |
| T89 | Task failed | ✅ PASS | Returns error details; tested |
| T90 | full_session mode | ✅ PASS | Returns formatted session messages; tested |
| T91 | message_limit cap | ✅ PASS | Capped at 100; tested |
| T92 | since_message_id | ✅ PASS | Returns messages after that ID; tested |
| T93 | since_message_id not found | ✅ PASS | Returns all messages when ID not found (filter returns -1); tested |
| T94 | thinking_max_chars | ✅ PASS | Thinking truncated to specified chars; tested |
| T95 | Empty task result fallback | ✅ PASS | Falls back to session last-assistant-message; tested |

### 2.9 background_cancel

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T96 | Cancel specific task | ✅ PASS | Task cancelled; tested in `background-task/cancel/handler.test.ts` |
| T97 | Cancel all | ✅ PASS | All running/queued tasks cancelled; tested |
| T98 | Cancel already completed | ✅ PASS | Returns error: cannot cancel terminal state; tested |
| T99 | Cancel non-existent | ✅ PASS | Returns error: task not found; tested |
| T100 | No args | ✅ PASS | Returns error: invalid arguments; tested |
| T101 | All with no running tasks | ✅ PASS | Returns "No running or queued tasks"; tested |
| T102 | Cancel all only cancels own children | ✅ PASS | PROPOSED FIX **was implemented**: `cancel/handler.ts:47` filters by `parentSessionID === callerSessionID` |

### 2.10 Session Manager Tools

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T103 | session_list default | ✅ PASS | Returns up to 20 sessions sorted by updated desc; `MAX_DEFAULT_SESSIONS=20`; tested |
| T104 | session_list with limit | ✅ PASS | `slice(0, args.limit)` applied; tested |
| T105 | session_list date filter | ✅ PASS | `isAfterDate` uses `new Date(fromDate).getTime()`; tested |
| T106 | session_list invalid date | ✅ PASS | **Fixed** — `Number.isNaN(from)` guard added to `isAfterDate`/`isBeforeDate`; NaN → `true` (keep session). Validated: mock with `from_date: "not-a-date"` returns both `ses_1` and `ses_2` in output (previously would return empty). `validate-fixes.test.ts` T106 |
| T107 | session_list filters child sessions | ✅ PASS | `filtered.filter((s) => !s.parentID)` excludes child sessions |
| T108 | session_read basic | ✅ PASS | Returns formatted messages; tested |
| T109 | session_read with limit | ✅ PASS | `messages.slice(0, args.limit)` — returns first N, not last N; tested |
| T110 | session_read limit=0 | ✅ PASS | `limit && limit > 0` guard — 0 is falsy → returns all messages |
| T111 | session_read include_todos | ✅ PASS | Fetches and appends todos when `include_todos: true`; tested |
| T112 | session_read include_transcript | ✅ PASS | **Fixed** — Dead parameter removed entirely from `SessionReadArgs`, plugin schema, and description. Validated: `Object.keys(tool.args)` does not contain `"include_transcript"`. `validate-fixes.test.ts` T112 |
| T113 | session_read thinking truncation | ✅ PASS | Truncated to 200 chars; tested |
| T114 | session_read tool input truncation | ✅ PASS | Truncated to 100 chars; tested |
| T115 | session_search found | ✅ PASS | Returns excerpts; tested |
| T116 | session_search no matches | ✅ PASS | Returns "No matches found"; tested |
| T117 | session_search empty query | ✅ PASS | Returns "No matches found" (not error); tested |
| T118 | session_search timeout | 🔍 UNTESTED | Runtime behavior — 60s timeout with 50+ slow sessions |
| T119 | session_search case sensitive | ✅ PASS | `case_sensitive` flag applied; tested |
| T120 | session_info basic | ✅ PASS | Returns metadata; tested |
| T121 | session_info hasTranscript | ✅ PASS | **Fixed** — `hasTranscript` field removed from `SessionDetail`, `buildSessionDetail` signature, and `formatSessionDetail` output. Validated: `formatSessionDetail(buildSessionDetail(...))` output does not contain the string `"Has Transcript"`. `validate-fixes.test.ts` T121 |

### 2.11 Task Management Tools

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T122 | task_create basic | ✅ PASS | Returns created task with UUID; tested |
| T123 | task_create empty subject | ✅ PASS | No content validation; succeeds; tested |
| T124 | task_create defaults | ✅ PASS | `priority=medium, status=pending` defaults; tested |
| T125 | task_get found | ✅ PASS | Returns full task details; tested |
| T126 | task_get not found | ✅ PASS | Returns "Task not found"; tested |
| T127 | task_get empty string | ✅ PASS | Returns "Task not found"; tested |
| T128 | task_list all | ✅ PASS | Returns all tasks in compact format; tested |
| T129 | task_list filter status | ✅ PASS | Filters by status; tested |
| T130 | task_list filter priority | ✅ PASS | Filters by priority; tested |
| T131 | task_list dual filter | ✅ PASS | AND logic applied; tested |
| T132 | task_list no results | ✅ PASS | Returns empty list message; tested |
| T133 | task_update basic | ✅ PASS | Status updated, updatedAt bumped; tested |
| T134 | task_update no-op | ✅ PASS | Still bumps `updatedAt`; tested |
| T135 | task_update not found | ✅ PASS | Returns error; tested |
| T136 | task_update backward transition | ✅ PASS | Allowed; no transition validation; tested |
| T137 | task_update can't clear content | ✅ PASS | `content: undefined` → content unchanged (only assigns when defined); tested |
| T138 | task store volatility | ✅ PASS | In-memory only; confirmed by `resetTaskStore()` test utility existence |

### 2.12 skill

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T139 | Load existing skill | ✅ PASS | `git-gud` skill loads and returns content; tested in `skill/handler.test.ts` |
| T140 | Skill not found | ✅ PASS | Returns error message; tested |
| T141 | No loader registered | ✅ PASS | Returns error; tested |
| T142 | Empty string from loader | ✅ PASS | Truthy check `content !== undefined` — empty string passes; treated as valid |
| T143 | Loader throws | ✅ PASS | **Fixed** — `registeredLoader.load()` wrapped in try/catch; exceptions return `"Error loading skill '\{name\}': \{message\}"`. Validated: loader that `throw new Error("loader exploded")` returns that string instead of propagating. `validate-fixes.test.ts` T143 |

### 2.13 look_at

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| T144 | Image file | ✅ PASS | Binary encoding sent; tested in `look-at/handler.test.ts` |
| T145 | PDF file | ✅ PASS | `application/pdf` mime used; tested |
| T146 | Text file | ✅ PASS | Content embedded in prompt; tested |
| T147 | SVG file | ✅ PASS | Treated as binary (extension-based); tested |
| T148 | Both inputs provided | ✅ PASS | Returns error: exactly one required; tested |
| T149 | Neither input | ✅ PASS | Returns error; tested |
| T150 | Raw base64 without data URI | ✅ PASS | Defaults to `image/png`; tested |
| T151 | Large file | ✅ PASS | **Fixed** — 1 MB size check added before `file.text()` read. Validated: file of `1024*1024+1` bytes returns error matching `/too large/i` and `/1 MB/i`; file of 13 bytes does NOT produce size-limit error. `validate-fixes.test.ts` T151 (2 tests) |

---

## Section 3: Hooks (H1–H119)

### 3.1 Context Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H1 | agents-injector first read | ✅ PASS | Full AGENTS.md content appended on first read; `injectedPaths.add(agentsPath)` after inject; tested in `context-injector/handlers/agents.test.ts` |
| H2 | agents-injector subsequent read (same dir) | ✅ PASS | `injectedPaths.has(agentsPath)` → short back-reference `"[Directory Context: ... — see full AGENTS.md injected above]"`; tested |
| H3 | agents-injector no AGENTS.md | ✅ PASS | `collectAgentsPaths` returns empty → nothing appended; tested |
| H4 | agents-injector undefined title | ✅ PASS | `resolveReadPath` returns `null` when title undefined → early return |
| H5 | agents-injector no sessionID | ✅ PASS | `sessionKey = typedInput.sessionID ?? "__default"` |
| H6 | readme-injector | ✅ PASS | README.md content appended when exists; confirmed in `context-injector/handlers/readme.ts` |
| H7 | readme-injector repeated | ✅ PASS | No caching/dedup in readme handler — injected on every matching read call (scenario correctly describes no-dedup behavior) |
| H8 | rules-injector | ✅ PASS | `.rules` and `RULES.md` checked; appended to system output; source in `context-injector/handlers/rules.ts` |
| H9 | rules-injector no files | ✅ PASS | Neither file exists → early return |
| H10 | compaction-context snapshot | ✅ PASS | One-shot snapshot injected then deleted; tested in `compaction-context/handler.test.ts` |
| H11 | compaction-context truncation | ✅ PASS | Todos truncated to 4000 chars; tested |
| H12 | compaction-context no todos or plans | ✅ PASS | Null snapshot, nothing stored; tested |
| H13 | phase-reminder orchestrator | ✅ PASS | Reminder prepended for orchestrator; tested in `phase-reminder/handler.test.ts` |
| H14 | phase-reminder non-orchestrator | ✅ PASS | No reminder for non-orchestrator; tested |
| H15 | phase-reminder idempotent | ✅ PASS | No duplicate reminder; tested |
| H16 | skill-discovery with skills | ✅ PASS | Skills list appended to system; `buildSkillsSystemBlock()` in `skill-discovery/plugin.ts` |
| H17 | skill-discovery no skills | ✅ PASS | Returns `null` → nothing appended when no skills |

### 3.2 Recovery Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H18 | edit-error: oldString not found | ✅ PASS | Recovery message appended; tested in `edit-error/handler.test.ts` |
| H19 | edit-error: multiple matches | ✅ PASS | Recovery message appended; tested |
| H20 | edit-error: same old and new | ✅ PASS | Recovery message appended; tested |
| H21 | edit-error: non-edit tool | ✅ PASS | Only triggers for edit tool; tested |
| H22 | edit-error: idempotent | ✅ PASS | Recovery marker check prevents duplicate; tested |
| H23 | json-error: JSON parse error | ✅ PASS | Recovery appended; tested in `json-error/handler.test.ts` |
| H24 | json-error: expected JSON content | ✅ PASS | Recovery appended; tested |
| H25 | json-error: valid JSON | ✅ PASS | No recovery for valid JSON; tested |
| H26 | session-recovery: crash pattern | ✅ PASS | Recovery context set; tested in `session-recovery/handler.test.ts` |
| H27 | session-recovery: non-matching error | ✅ PASS | No recovery for rate-limit pattern; tested |
| H28 | session-recovery: existing context | ✅ PASS | Appends to existing context; tested |
| H29 | context-window-limit: 90% usage | ✅ PASS | Recovery actions triggered at ≥ threshold; tested in `context-window-limit/handler.test.ts` |
| H30 | context-window-limit: percentage format | ✅ PASS | Values >1 divided by 100; tested |
| H31 | context-window-limit: token limit error | ✅ PASS | Recovery context set on error event; tested |
| H32 | error-diagnostics: rate limit | ✅ PASS | Diagnostic block appended for 429; tested in `error-diagnostics/handler.test.ts` |
| H33 | error-diagnostics: long output | ✅ PASS | SKIPPED for outputs >1500 chars; tested |
| H34 | error-diagnostics: event error | ✅ PASS | `recoveryContext` set for permission denied; tested |
| H35 | error-diagnostics: pattern priority | ✅ PASS | First match wins; tested |

### 3.3 Model Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H36 | model-fallback: rate limit | ✅ PASS | 429 → switches to next model; tested in `model-fallback/handler.test.ts` |
| H37 | model-fallback: service unavailable | ✅ PASS | 503 → switches to next model; tested |
| H38 | model-fallback: no sessionID | ✅ PASS | Early return; tested |
| H39 | model-fallback: no eligible model | ✅ PASS | Returns without switching; tested |
| H40 | model-fallback: next same as current | ✅ PASS | No-op; tested |
| H41 | runtime-fallback: model not found | ✅ PASS | Switches to available model; tested in `runtime-fallback/handler.test.ts` |
| H42 | runtime-fallback: context exceeded | ✅ PASS | Switches to model with larger context; tested |
| H43 | runtime-fallback: same provider first | ✅ PASS | Same-provider models tried first; tested |
| H44 | preemptive-compaction: threshold reached | ✅ PASS | `compactSession` called at ≥80%; tested in `preemptive-compaction/handler.test.ts` |
| H45 | preemptive-compaction: already compacted | ✅ PASS | `Set` prevents re-compaction; tested |
| H46 | preemptive-compaction: drops below threshold | ✅ PASS | Cleared from Set → re-compaction allowed; tested |
| H47 | preemptive-compaction: compaction failure | ✅ PASS | Removed from Set on failure (allows retry); tested |
| H48 | preemptive-compaction: no contextLimit | ✅ PASS | Early return on `contextLimit: 0`; tested |

### 3.4 Quality Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H49 | comment-checker: empty catch block | ✅ PASS | Warning appended; tested in `comment-checker/handler.test.ts` |
| H50 | comment-checker: catch with body | ✅ PASS | No warning; tested |
| H51 | comment-checker: non-write tool | ✅ PASS | Only triggers for write tool; tested |
| H52 | write-file-guard: read then write | ✅ PASS | Write allowed after read; tested in `write-file-guard/handler.test.ts` |
| H53 | write-file-guard: write without read | ✅ PASS | **Throws Error** blocking write; tested |
| H54 | write-file-guard: new file | ✅ PASS | Always allowed for new files; tested |
| H55 | write-file-guard: .sisyphus/ path | ✅ PASS | `canonicalPath.includes("/.sisyphus/")` → always allowed; source confirmed |
| H56 | write-file-guard: read consumed | ✅ PASS | Read consumed on first write; second write throws; tested |
| H57 | write-file-guard: session cleanup | ✅ PASS | `session.deleted` cleans state; tested |
| H58 | write-file-guard: 256 session limit | ✅ PASS | `MAX_TRACKED_SESSIONS=256`; oldest evicted at 257th; source confirmed |
| H59 | write-file-guard: 1024 path limit | ✅ PASS | `MAX_PATHS_PER_SESSION=1024`; oldest path evicted; source confirmed |
| H60 | thinking-block-validator: malformed thinking | ✅ PASS | Empty thinking part removed; tested in `thinking-block-validator/handler.test.ts` |
| H61 | thinking-block-validator: valid thinking | ✅ PASS | Kept as-is; tested |
| H62 | tool-pairing-validator: orphaned tool_use | ✅ PASS | Orphaned part removed; tested in `tool-pairing-validator/handler.test.ts` |
| H63 | tool-pairing-validator: orphaned tool_result | ✅ PASS | Orphaned part removed; tested |
| H64 | tool-pairing-validator: paired correctly | ✅ PASS | Both kept; tested |

### 3.5 Productivity Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H65 | keyword-detector: ultrawork | ✅ PASS | Sets mode to "ultrawork"; tested in `keyword-detector/handler.test.ts` |
| H66 | keyword-detector: ulw shorthand | ✅ PASS | "ulw" triggers "ultrawork" mode; tested |
| H67 | keyword-detector: in code block | ✅ PASS | Code blocks stripped before detection; tested |
| H68 | keyword-detector: deep-think | ✅ PASS | Sets mode to "think"; tested |
| H69 | keyword-detector: fast | ✅ PASS | Sets mode to "fast"; tested |
| H70 | keyword-detector: priority | ✅ PASS | First match (ultrawork) wins; tested |
| H71 | think-mode: Claude model | ✅ PASS | `options.thinking` set with 10000 budget for Claude; tested in `think-mode/handler.test.ts` |
| H72 | think-mode: non-Claude | ✅ PASS | No thinking injection for non-Claude; tested |
| H73 | think-mode: already set | ✅ PASS | Skipped if already defined; tested |
| H74 | anthropic-effort: medium | ✅ PASS | Budget=5000 for medium; tested in `anthropic-effort/handler.test.ts` |
| H75 | anthropic-effort: max on Opus | ✅ PASS | Budget=32000 + `effort="max"`; tested |
| H76 | anthropic-effort: low | ✅ PASS | No-op for low effort; tested |
| H77 | ultrawork-mode: Claude | ✅ PASS | Thinking injected + `<ultrawork-mode>` in system; tested in `ultrawork-mode/handler.test.ts` |
| H78 | ultrawork-mode: non-Claude | ✅ PASS | Only system context, no thinking; tested |
| H79 | ultrawork-mode: idempotent | ✅ PASS | No duplicate injection; tested |

### 3.6 Output Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H80 | tool-output-truncator: large output | ✅ PASS | Written to temp file, truncated; tested in `tool-output-truncator/handler.test.ts` |
| H81 | tool-output-truncator: >2000 lines | ✅ PASS | Truncated to 2000 lines + notice; tested |
| H82 | tool-output-truncator: non-truncatable tool | ✅ PASS | Read tool not in truncatable set; tested |
| H83 | tool-output-truncator: case sensitivity | ✅ PASS | Both `"bash"` and `"Bash"` in `TRUNCATABLE_TOOLS` Set; source confirmed |
| H84 | hashline-read-enhancer: read tool | ✅ PASS | `1: content` → `1#HASH|content`; tested in `hashline-read-enhancer/handler.test.ts` |
| H85 | hashline-read-enhancer: write tool | ✅ PASS | Replaced with `"File written. N lines."`; tested |
| H86 | hashline-read-enhancer: write error | ✅ PASS | Output starting with "error" kept unchanged; tested |
| H87 | hashline-read-enhancer: truncated line | ✅ PASS | No hash for truncated lines; tested |
| H88 | hashline-read-enhancer: non-text file | ✅ PASS | Returned unchanged when first line doesn't match; tested |
| H89 | hashline-diff-enhancer: before capture | ✅ PASS | Old file content captured before write; tested in `hashline-diff-enhancer/handler.test.ts` |
| H90 | hashline-diff-enhancer: stale cleanup | ✅ PASS | Captures older than 5 minutes cleaned; tested |
| H91 | hashline-diff-enhancer: no before capture | ✅ PASS | Returns without diff metadata when no capture; tested |

### 3.7 Continuation Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H92 | todo-enforcer: pending todos | ✅ PASS | Continuation message injected; tested in `todo-enforcer/handler.test.ts` |
| H93 | todo-enforcer: all complete | ✅ PASS | No injection; tested |
| H94 | todo-enforcer: no sessionID | ✅ PASS | Early return; tested |
| H95 | compaction-todo-preserver: with todos | ✅ PASS | Snapshot prepended; tested in `compaction-todo-preserver/handler.test.ts` |
| H96 | compaction-todo-preserver: all statuses | ✅ PASS | ALL statuses included (completed, cancelled, pending); tested |
| H97 | stop-guard: stop with pending todos | ✅ PASS | Stop guard message injected; tested in `stop-guard/handler.test.ts` |
| H98 | stop-guard: stop with complete todos | ✅ PASS | No injection; tested |
| H99 | stop-guard: no stop pattern | ✅ PASS | No injection; tested |
| H100 | foreground-fallback: rate limit | ✅ PASS | Retry with fallback model; tested in `foreground-fallback/handler.test.ts` |
| H101 | foreground-fallback: dedup window | ✅ PASS | Same session+model within 5s ignored; tested |
| H102 | foreground-fallback: concurrent lock | ✅ PASS | Ignored via `inProgress` Set; tested |
| H103 | foreground-fallback: no fallback available | ✅ PASS | Logs and returns; tested |
| H104 | foreground-fallback: cleanup | ✅ PASS | Entries >5min cleaned when >100 entries; tested |

### 3.8 Task Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H105 | delegate-retry: missing run_in_background | ✅ PASS | Retry guidance with fix hint; tested in `delegate-retry/handler.test.ts` |
| H106 | delegate-retry: unknown category | ✅ PASS | Lists available categories; tested |
| H107 | delegate-retry: non-task tool | ✅ PASS | Ignored for non-task tools; tested |
| H108 | empty-response-detector: null output | ✅ PASS | Warning injected; tested in `empty-response-detector/handler.test.ts` |
| H109 | empty-response-detector: near-empty | ✅ PASS | Warning for <10 chars; tested |
| H110 | empty-response-detector: normal output | ✅ PASS | No modification; tested |
| H111 | task-resume-info: session_id extraction | ✅ PASS | Session ID extracted, continuation line added; tested in `task-resume-info/handler.test.ts` |
| H112 | task-resume-info: error output | ✅ PASS | Skipped for error outputs; tested |
| H113 | todowrite-disabler: subagent | ✅ PASS | **Throws Error** blocking call; tested in `todowrite-disabler/handler.test.ts` |
| H114 | todowrite-disabler: orchestrator | ✅ PASS | Allowed through; tested |
| H115 | todowrite-disabler: undefined agent | ✅ PASS | Allowed (not subagent); tested |

### 3.9 Nudge Hooks

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| H116 | post-read-nudge: below threshold | ✅ PASS | Gentle `POST_READ_NUDGE` appended on 1st-2nd read; tested in `post-read-nudge/handler.test.ts` |
| H117 | post-read-nudge: at threshold | ✅ PASS | Escalated `DELEGATION_ESCALATION_NUDGE` at 3rd+ exploration call; source: `DELEGATION_NUDGE_THRESHOLD=3` |
| H118 | post-read-nudge: grep counts but no nudge | ✅ PASS | `isExplorationTool("grep")` = true (increments counter) but `isReadTool("grep")` = false (no nudge appended); source confirmed |
| H119 | post-read-nudge: idempotent | ✅ PASS | `text.includes(POST_READ_NUDGE.trim())` guard prevents duplicate |

---

## Section 4: Features (F1–F59)

### 4.1 Background Agent System

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| F1 | Task lifecycle: queued → running → completed | ✅ PASS | Tested in `background-agent/manager.test.ts` |
| F2 | Task lifecycle: queued → cancelled | ✅ PASS | Tested; slot not released for cancelled-before-start |
| F3 | Task lifecycle: running → failed | ✅ PASS | Tested; concurrency released on failure |
| F4 | Concurrent cancel during spawn | ✅ PASS | Tested; session detected as cancelled, deleted |
| F5 | Session idle with 0 messages before MIN_IDLE_TIME | ✅ PASS | Ignored if <5s; tested |
| F6 | Session idle with 0 messages after MIN_IDLE_TIME | ✅ PASS | Task failed: "no output"; tested |
| F7 | Last message is tool result | ✅ PASS | Waits for next idle; tested |
| F8 | Multiple waitForCompletion callers | ✅ PASS | All notified; tested |
| F9 | waitForCompletion timeout | ✅ PASS | Resolves with current state; tested |
| F10 | Task TTL eviction | ✅ PASS | Removed after 5+ min; tested |
| F11 | dispose() with pending waiters | ✅ PASS | All waiters resolved; tested |
| F12 | Concurrency: 10 tasks on same model | ✅ PASS | Default pool size raised to 10; 11th task queues. Depth-keyed pools (`model:depth`) are separate — depth-0 and depth-1 tasks don't share slots. Tested in `background-agent/concurrency.test.ts`; pool-size increase tested in `validate-fixes.test.ts` F15 |
| F13 | Concurrency: release unblocks queue | ✅ PASS | Tested; queued task starts on release |
| F14 | Concurrency: release at 0 count | ✅ PASS | `Math.max(0, current-1)` prevents negative; source confirmed |
| F15 | Concurrency starvation | ✅ PASS | **Fixed in PR #46** (`cbc65c2`) — depth-keyed concurrency pools (`"model:depth"`) ensure parents (`:0`) and children (`:1`) have independent semaphores. Validated: filled 10 parent slots on `claude-opus-4-6:0`, then immediately acquired a child slot on `claude-opus-4-6:1` with queue length 0 — proves child pool is independent. `validate-fixes.test.ts` F15 (2 tests) |
| F16 | Event-hook: unknown session idle | ✅ PASS | Early return when `tasksBySessionId.get()` = undefined; tested |
| F17 | Event-hook: manager not initialized | ✅ PASS | Catches "not initialized" error; tested |

### 4.2 Loop System

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| F18 | Start loop | ✅ PASS | `[SYSTEM DIRECTIVE: LOOP CONTINUE]` sent; tested in `features/loops/loops.test.ts` |
| F19 | Loop completion detection | ✅ PASS | `<promise>DONE</promise>` stops loop; tested |
| F20 | Max iterations reached | ✅ PASS | Stops at `DEFAULT_MAX_ITERATIONS=100`; tested |
| F21 | Unbounded max | ✅ PASS | Runs to `maxIterations: 1000`; tested |
| F22 | Invalid maxIterations: 0 | ✅ PASS | `0 <= 0` → `RangeError`; source: `!Number.isSafeInteger(n) || n <= 0` |
| F23 | Invalid maxIterations: NaN | ✅ PASS | `!Number.isSafeInteger(NaN)` → `RangeError` |
| F24 | Invalid maxIterations: Infinity | ✅ PASS | `!Number.isSafeInteger(Infinity)` → `RangeError` |
| F25 | Routed store: persist=true | ✅ PASS | Uses `FileLoopStore`; tested |
| F26 | Routed store: persist=false | ✅ PASS | Uses `MemoryLoopStore`; tested |
| F27 | Routed store: switch stores | ✅ PASS | Memory stopped before file started; tested |
| F28 | File store: invalid JSON on disk | ✅ PASS | Logs error, continues with empty state; tested |
| F29 | File store: invalid shape on disk | ✅ PASS | Invalid entries skipped; tested |
| F30 | File store: atomic write | ✅ PASS | Temp file + rename; tested |
| F31 | Memory store: returns clones | ✅ PASS | Original unchanged; tested |
| F32 | Stop non-existent loop | ✅ PASS | No-op, no error; tested |

### 4.3 Skills System

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| F33 | Load builtin git-gud | ✅ PASS | Returns comprehensive git workflow guide; tested in `features/skills/skills.test.ts` |
| F34 | Load project skill | ✅ PASS | Parsed and available; tested |
| F35 | No skills directory | ✅ PASS | Returns empty array; tested |
| F36 | Skill with no frontmatter | ✅ PASS | Name from filename, empty description; tested |
| F37 | Skill with only frontmatter | ✅ PASS | Skipped (empty template); tested |
| F38 | Non-.md files | ✅ PASS | Ignored; tested |
| F39 | Project overrides builtin | ✅ PASS | Project version wins in merge; tested |
| F40 | Frontmatter colons in description | ✅ PASS | First colon is separator; tested |
| F41 | Skill sync to disk | ✅ PASS | Written to `~/.local/share/goatcode-sh/skills/git-gud/SKILL.md`; tested |

### 4.4 Categories System

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| F42 | Resolve known category | ✅ PASS | Returns config with model and variant; tested in `features/categories/categories.test.ts` |
| F43 | Resolve unknown category | ✅ PASS | Returns `undefined`; tested |
| F44 | Category config override | ✅ PASS | Overridden model used; tested |
| F45 | All 8 categories exist | ✅ PASS | All 8 names verified in test |
| F46 | Category with prompt_append | ✅ PASS | Appended to child prompt; confirmed in `executor.ts` |
| F47 | Category fallback chain | ✅ PASS | Falls back through chain when provider disconnected; tested |

### 4.5 Prompt Builder

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| F48 | Build orchestrator prompt | ✅ PASS | Base prompt + agent table + skills + categories; tested in `features/prompt-builder/prompt-builder.test.ts` |
| F49 | Empty agents | ✅ PASS | Agent table section omitted; tested |
| F50 | Empty skills | ✅ PASS | Skills section omitted; tested |
| F51 | Agent description with pipe | ✅ PASS | Pipe escaped in markdown table; tested |
| F52 | Skill with multiline description | ✅ PASS | Collapsed to single line; tested |
| F53 | Agent description truncation | ✅ PASS | Truncated at first `.`; tested |

### 4.6 Auto-Update

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| F54 | First session triggers check | ✅ PASS | Tested in `features/auto-update/auto-update.test.ts` |
| F55 | Subsequent sessions skip | ✅ PASS | Once-per-process guard; tested |
| F56 | auto_update disabled | ✅ PASS | Check skipped; tested |
| F57 | Update available | ✅ PASS | Notification shown; tested |
| F58 | Already up to date | ✅ PASS | Silent; tested |
| F59 | Check failure | ✅ PASS | Logged, no crash; tested |

---

## Section 5: Configuration (C1–C13)

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| C1 | Project config loads | ✅ PASS | Tested in `config/loader.test.ts` |
| C2 | User config loads | ✅ PASS | Tested |
| C3 | Both configs merge | ✅ PASS | Project wins on conflicts; tested |
| C4 | Legacy config detected | ✅ PASS | `ochead.config.ts` used with deprecation warning; tested |
| C5 | Invalid config | ✅ PASS | Returns `null`; tested |
| C6 | Config exports function | ✅ PASS | Function called; tested |
| C7 | Config exports async function | ✅ PASS | Awaited; tested |
| C8 | Partial config | ✅ PASS | Zod defaults fill other fields; tested in `config/schema.test.ts` |
| C9 | Temperature out of range | ✅ PASS | `default_temperature: 3` rejected (0-2 range); tested |
| C10 | GOATCODE_CONFIG_DIR override | ✅ PASS | Env var path used; tested in `config/ensure-user-config.test.ts` |
| C11 | ensureUserConfig concurrent | ✅ PASS | `wx` flag prevents EEXIST race; tested |
| C12 | disabled_hooks | ✅ PASS | Phase-reminder excluded; tested in `registry/contribution-aggregator.test.ts` |
| C13 | disabled_tools | ✅ PASS | Hashline edit excluded; tested |

---

## Section 6: Plugin Architecture (P1–P11)

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| P1 | Plugin registration | ✅ PASS | `registry.register()` adds plugin; tested in `registry/plugin-registry.test.ts` |
| P2 | Plugin dependency resolution | ✅ PASS | B loaded before A; tested in `registry/dependency-resolver.test.ts` |
| P3 | Circular dependency | ✅ PASS | Error or handled gracefully; tested |
| P4 | Plugin setup runs | ✅ PASS | Setup called with context; tested in `registry/plugin-lifecycle.integration.test.ts` |
| P5 | Plugin aggregation | ✅ PASS | Merged contributions; tested in `registry/contribution-aggregator.test.ts` |
| P6 | Config hook ordering | ✅ PASS | Compositor config hook runs first (pre-registered); source confirmed in `composer.ts` |
| P7 | Hook handler isolation | ✅ PASS | Per-handler try/catch in `buildSlotHandler`; source confirmed in `compositor.ts` |
| P8 | Tool name conflict | ✅ PASS | Last one wins (shallow copy overwrite); tested in `registry/contribution-conflicts.integration.test.ts` |
| P9 | Compositor first run | ✅ PASS | `connected === null` → skips model assignment; source confirmed |
| P10 | Compositor disables built-in agents | ✅ PASS | `input.agent.build = { disable: true }` and `input.agent.plan = { disable: true }` in compositor; source confirmed |
| P11 | External plugin loading | ✅ PASS | `config.plugins` array imported; tested in `registry/plugin-overrides.integration.test.ts` |

---

## Section 7: Provider Discovery & Model Resolution (PR1–PR17)

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| PR1 | Discovery builds index | ✅ PASS | Tested in `shared/provider-discovery.test.ts` |
| PR2 | Discovery timeout | ✅ PASS | 15s timeout; tested |
| PR3 | Provider names normalized | ✅ PASS | Lowercase; tested |
| PR4 | Model resolution: explicit override | ✅ PASS | Override used directly; tested in `shared/model-resolution-pipeline.test.ts` |
| PR5 | Model resolution: fallback chain walk | ✅ PASS | Second match returned; tested |
| PR6 | Model resolution: first-run null | ✅ PASS | Returns undefined when connectedProviders=null; tested |
| PR7 | Connected providers cache: disk read | ✅ PASS | Returns from disk; tested in `shared/connected-providers-cache.test.ts` |
| PR8 | Connected providers cache: memory priority | ✅ PASS | Memory cache returned; tested |
| PR9 | Connected providers cache: invalid JSON | ✅ PASS | Returns null; tested |
| PR10 | Connected providers cache: atomic write | ✅ PASS | Temp file + rename; tested |
| PR11 | Model normalization: undefined | ✅ PASS | Returns `undefined`; tested in `shared/model-normalization.test.ts` |
| PR12 | Model normalization: empty | ✅ PASS | Returns `undefined`; tested |
| PR13 | parseModelId: no slash | ✅ PASS | Returns `undefined`; tested |
| PR14 | parseModelId: with slash | ✅ PASS | Returns `{ provider, modelId }`; tested |
| PR15 | Model availability: prefix match | ✅ PASS | `"gpt-5.4"` available + check `"gpt-5"` → `true` (separator match via `/[/\-.]/.test`); source confirmed |
| PR16 | Model availability: empty set | ✅ PASS | `availableModels.size === 0 → return true`; source confirmed |
| PR17 | resolveQualifiedModel | ✅ PASS | Checks availability, finds alternative; tested |

---

## Section 8: Delegation System (D1–D8)

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| D1 | Depth enforcement tree | ✅ PASS | Depth 2 blocks delegation; tested in `delegate-task.test.ts` |
| D2 | Depth marker injection | ✅ PASS | `<!-- goatcode:delegation_depth=1 -->` injected; tested |
| D3 | Depth marker in first 3 messages | ✅ PASS | Only first 3 messages checked; source confirmed in `handler.ts` (messages scan limit) |
| D4 | Depth marker absent | ✅ PASS | Returns 0; tested |
| D5 | Depth extraction API error | ✅ PASS | Returns null → delegation blocked; tested |
| D6 | Sync vs background routing | ✅ PASS | Correct executor called based on `run_in_background`; tested |
| D7 | Category prompt_append | ✅ PASS | Appended to prompt; tested |
| D8 | Session continuation | ✅ PASS | Existing session resumed; tested |

---

## Section 9: CLI (CL1–CL7)

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| CL1 | `goatcode install` | ✅ PASS | `goatcode.config.ts` generated; tested in `cli/commands/install.test.ts` |
| CL2 | `goatcode install --force` | ✅ PASS | Config overwritten; tested |
| CL3 | `goatcode install --non-interactive` | ✅ PASS | No prompts; tested |
| CL4 | `goatcode update` | ✅ PASS | Update installed; tested in `cli/commands/update.test.ts` |
| CL5 | Config generator: agent stubs | ✅ PASS | All 7 agent names as commented stubs; tested in `cli/config-generator.test.ts` |
| CL6 | Config generator: category stubs | ✅ PASS | All 8 category names as commented stubs; tested |
| CL7 | User config generator | ✅ PASS | Includes provider_priority, agent overrides; tested |

---

## Section 10: Cross-Cutting (X1–X14)

### 10.1 State Isolation

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| X1 | Task store reset | ✅ PASS | `resetTaskStore()` utility exists; used in tests |
| X2 | Connected providers cache reset | ✅ PASS | `resetConnectedProvidersCache()` exists; used in tests |
| X3 | Keyword detector state | ✅ PASS | `clearSessionMode()` exists; used in tests |
| X4 | Write-file-guard state | ✅ PASS | Session tracking cleaned up via session cleanup |
| X5 | Skill loader singleton | ✅ PASS | `registeredLoader` reset between tests |

### 10.2 Error Propagation

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| X6 | Tools return strings, never throw | ✅ PASS | All tool handlers wrap in try/catch → return `"Error: ..."` string; pattern consistent across all 23 tools |
| X7 | Hooks that throw (blocking) | ✅ PASS | `write-file-guard` and `todowrite-disabler` throw `Error` before tool execution; tested |
| X8 | Hooks that catch (non-blocking) | ✅ PASS | `buildSlotHandler` in compositor wraps each hook with try/catch; confirmed in `compositor.ts` |
| X9 | Plugin setup failure | ✅ PASS | Error logged, other plugins continue; tested in `registry/plugin-lifecycle.integration.test.ts` |

### 10.3 Integration Scenarios

| # | Scenario | Result | Evidence |
|---|---------|--------|---------|
| X10 | Full bootstrap pipeline | ✅ PASS | All agents, tools, hooks available; tested in `bootstrap.integration.test.ts` (6 tests pass) |
| X11 | Background task → event → completion | 🔍 UNTESTED | Full end-to-end runtime cycle; not covered by existing integration tests |
| X12 | Delegation → depth enforcement → execution | ✅ PASS | Depth markers injected and enforced; tested in `delegate-task.test.ts` |
| X13 | Config override → agent model change | ✅ PASS | Orchestrator uses overridden model; tested in `registry/plugin-overrides.integration.test.ts` |
| X14 | Skill load → discovery → tool enhancement | ✅ PASS | Skills listed in system prompt and `skill` tool description; confirmed in `skill-discovery/plugin.ts` |

---

## Summary

### Overall Counts

| Result | Count |
|--------|-------|
| ✅ PASS | **423** |
| ❌ FAIL | **0** |
| ⚠️ KNOWN ISSUE | **0** |
| 🔍 UNTESTED | 3 |
| **Total** | **426** |

> **Note:** The TEST_SCENARIOS.md summary table shows "~272 scenarios" but the actual numbered IDs span A1–A27 (27), T1–T151 (151), H1–H119 (119), F1–F59 (59), C1–C13 (13), P1–P11 (11), PR1–PR17 (17), D1–D8 (8), CL1–CL7 (7), X1–X14 (14) = **426 scenarios**. The summary in the scenarios doc appears to have miscounted the T, H, and F sections. All 426 scenarios have been evaluated here.

### Test Infrastructure

- **Baseline test run**: 923 tests, 0 failures (via official `npm test` script)
- **Fix validation**: 20 additional scenario-reproduction tests in `src/validate-fixes.test.ts` — each one runs the exact failure condition described in the scenario and asserts the corrected behaviour
- **Test isolation note**: `spawner.test.ts` fails when run alongside certain deps tests via pattern matching (mock state leak from `afterAll`); passes correctly via official script

---

## All Bugs Resolved

All 11 confirmed bugs and known issues from the initial test run have been fixed and directly validated:

| # | Scenario | Fix | Commit | Validation |
|---|---------|-----|--------|-----------|
| A22 | `fallback_models` config silently ignored | `buildCustomFallbackChain()` + `agentOverrides` threaded into `compose()` | `73f93bf` | `validate-fixes.test.ts` A22 |
| T65 | `error: 0` incorrectly throws in LSP | Truthy check `if (record.error)` | `82ae771` | `validate-fixes.test.ts` T65, `client.test.ts` |
| T60 | `lsp_rename` accepts empty `newName` | `.min(1)` on `newName` | `4418002` | `validate-fixes.test.ts` T60 |
| T62 | LSP tools accept float line numbers | `.int()` on `line`/`character` | `4418002` | `validate-fixes.test.ts` T62 |
| T64 | `prepare_rename []` returns `"[]"` | Empty-array guard added | `4418002` | `validate-fixes.test.ts` T64 |
| T106 | Invalid `from_date` silently drops all sessions | `Number.isNaN` guard → keep session | `27df5a6` | `validate-fixes.test.ts` T106 |
| T112 | `include_transcript` dead parameter | Parameter removed from schema | `27df5a6` | `validate-fixes.test.ts` T112 |
| T121 | `hasTranscript` hardcoded false in output | Field removed from output | `27df5a6` | `validate-fixes.test.ts` T121 |
| T143 | Skill loader exceptions propagate | `try/catch` in `executeSkill` | `27df5a6` | `validate-fixes.test.ts` T143 |
| T151 | `look_at` no text file size limit | 1 MB guard before `file.text()` | `27df5a6` | `validate-fixes.test.ts` T151 |
| F15 | Background concurrency starvation | Depth-keyed pools in `ConcurrencyManager` | `cbc65c2` (PR #46) | `validate-fixes.test.ts` F15 |

## Remaining Open Items

| # | Scenario | Reason |
|---|---------|--------|
| A7 | Subagent agents ignore UI model | Runtime enforcement is in OpenCode's agent dispatcher, not GoatCode code |
| T118 | session_search timeout | Runtime-only — requires 50+ slow sessions over 60s |
| X11 | Background task → event → completion | Full end-to-end runtime cycle not covered by unit tests |
