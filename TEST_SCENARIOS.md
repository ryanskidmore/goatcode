# GoatCode Test Scenarios — Comprehensive Self-Executable Suite

Every scenario follows: **Given → When → Then** with edge cases. Organized to match TEST_PLAN.md structure.

---

## 1. Agents

### 1.1 Agent Registration & Plugin Metadata

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| A1 | All 7 agents registered | Bootstrap completes | `registry.getAgents()` | Returns exactly: orchestrator, deepworker, planner, advisor, researcher, explorer, worker |
| A2 | Agent plugin has name/version | Agent plugin loaded | Read `name` and `version` | Non-empty string name, valid semver version |
| A3 | Disabled agents excluded | `disabled_agents: ["advisor"]` in config | `registry.aggregate()` | Advisor absent from aggregated agents |
| A4 | Unknown agent in disabled list | `disabled_agents: ["nonexistent"]` | Aggregation | No error; other agents unaffected |

### 1.2 Agent Modes

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| A5 | `all` mode agents (orchestrator, deepworker, planner, researcher) | Agent in `all` mode | Queried as primary or subagent | Available in both contexts |
| A6 | `subagent` mode agents (advisor, explorer, worker) | Agent in `subagent` mode | Queried as primary | Not available as primary |
| A7 | `subagent` agents ignore UI model | Explorer set as subagent | User selects different model in UI | Explorer still uses its own fallback chain |

### 1.3 Tool Restrictions

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| A8 | Advisor denied tools | Advisor agent | Attempts `write`, `edit`, `bash`, `interactive_bash`, `delegate_task`, `task_create`, `task_update` | Each tool blocked |
| A9 | Advisor allowed tools | Advisor agent | Attempts `read`, `grep`, `glob` | Each tool allowed |
| A10 | Explorer allowed-only whitelist | Explorer agent | Attempts `read`, `glob`, `grep`, `lsp_*`, `ast_grep_search`, `look_at`, `todowrite` | All allowed |
| A11 | Explorer denied-by-omission | Explorer agent | Attempts `write`, `edit`, `bash`, `delegate_task` | Each tool blocked |
| A12 | Orchestrator full access | Orchestrator agent | Attempts any tool | All tools available |
| A13 | Config denied_tools override | Agent config adds `denied_tools: ["bash"]` | Agent attempts `bash` | Blocked even if not in base restrictions |
| A14 | Empty denied_tools | Agent with `denied_tools: []` | Any tool | All tools available |
| A15 | Unknown tool in denied list | `denied_tools: ["nonexistent_tool"]` | Build tools map | No error; known tools unaffected |

### 1.4 Fallback Chains

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| A16 | First provider connected | Anthropic connected | Resolve orchestrator model | Returns `anthropic/claude-opus-4-6` |
| A17 | First provider disconnected | Anthropic disconnected, OpenAI connected | Resolve orchestrator model | Returns `openai/gpt-5.4` |
| A18 | All providers disconnected | No providers connected | Resolve any agent model | Returns `undefined`; OpenCode handles routing |
| A19 | First-run (null provider cache) | No connected providers cache file | Resolve model | Returns `undefined`; skip model assignment |
| A20 | Unknown agent fallback chain | `getFallbackChain("nonexistent")` | Query | Returns empty array `[]` |
| A21 | `opencode` provider universal fallback | Only `opencode` provider connected | Resolve any agent | Matches (opencode in every chain entry) |
| A22 | Config fallback_models override | Agent config has `fallback_models: ["provider/custom-model"]` | Resolution | Uses custom chain instead of default |

### 1.5 Agent Builder

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| A23 | Agent with empty model string | Config override `model: ""` | Build agent | Falls back to default or errors gracefully |
| A24 | Agent override temperature | Config `temperature: 1.5` | Build agent | Temperature applied |
| A25 | Agent override prompt_append | Config `prompt_append: "Extra rules"` | Build agent system prompt | Appended after base prompt |
| A26 | Agent disable via config | Config `disable: true` | Agent registration | Agent excluded from registry |
| A27 | AgentRegistry duplicate register | Same agent name registered twice | `register()` second time | Overwrites silently, logs warning |

---

## 2. Tools

### 2.1 grep

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T1 | Pattern match found | File with matching content | `grep(pattern: "foo")` | Returns matching lines |
| T2 | No matches | No files match pattern | `grep(pattern: "zzz_nonexistent")` | Returns `"No matches found"` |
| T3 | Invalid regex | Malformed regex pattern | `grep(pattern: "[invalid")` | Returns `"Error: ..."` string, not exception |
| T4 | Include filter | Multiple file types | `grep(pattern: "x", include: "*.ts")` | Only .ts files searched |
| T5 | Output modes | File with matches | Mode `content` / `files_with_matches` / `count` | Each returns correct format |
| T6 | Head limit | Many matches | `head_limit: 5` | At most 5 results returned |
| T7 | Head limit zero | Many matches | `head_limit: 0` | All results (unlimited) |
| T8 | Negative head limit | `head_limit: -1` | Execute | Treated as unlimited (≤0 check) |
| T9 | Binary file exclusion | Binary file with matching bytes | Search | Binary file excluded from results |
| T10 | Empty pattern | `pattern: ""` | Execute | Grep behavior (matches all lines) or error |

### 2.2 glob

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T11 | Pattern matches files | Files exist | `glob(pattern: "*.ts")` | Returns absolute paths sorted by mtime desc |
| T12 | No files found | No matching files | `glob(pattern: "*.nonexistent")` | Returns `"No files found"` |
| T13 | 100 file hard cap | 150+ matching files | Execute | Returns exactly 100, most recent first |
| T14 | No truncation warning | Exactly 101 files | Execute | Result capped at 100, no warning appended |
| T15 | Single stat failure | One file deleted during scan | `stat()` rejects | Entire operation fails (Promise.all) |
| T16 | Nested glob | `pattern: "**/*.ts"` | Execute | Recurses directories |
| T17 | Path parameter | `path: "/specific/dir"` | Execute | Only searches within that directory |

### 2.3 ast_grep_search

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T18 | Valid pattern match | TypeScript file with matching AST | `pattern: "console.log($MSG)", lang: "typescript"` | Returns matches with context |
| T19 | No matches | No AST matches | Execute | Returns appropriate empty message |
| T20 | `sg` binary not found | ast-grep not installed | Execute | Returns specific `"sg not found"` message |
| T21 | Invalid language | `lang: "invalid"` | Execute | Zod validation rejects (enum) |
| T22 | Empty paths array | `paths: []` | Execute | Defaults to `["."]` (falsy check) |
| T23 | Custom paths | `paths: ["src/tools"]` | Execute | Only searches in specified paths |
| T24 | Context lines | `context: 3` | Execute | Shows 3 lines of context around matches |

### 2.4 ast_grep_replace

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T25 | Dry run (default) | `dryRun: undefined` | Execute | Prefixed with `"[DRY RUN]"`, no files changed |
| T26 | Dry run explicit true | `dryRun: true` | Execute | Prefixed with `"[DRY RUN]"` |
| T27 | Actual replace | `dryRun: false` (strict equality) | Execute | Files modified, no `"[DRY RUN]"` prefix |
| T28 | No matches to replace | Pattern doesn't match | Execute | Returns `"No matches found to replace"` |

### 2.5 hashline_edit (Most Complex Tool)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T29 | replace_line | Valid LINE#HASH | Single line replaced | File updated correctly |
| T30 | replace_range | Valid start and end hashes | Range replaced | Lines between pos..end inclusive replaced |
| T31 | append_at | Valid anchor line | Insert after | New lines appear after anchor |
| T32 | prepend_at | Valid anchor line | Insert before | New lines appear before anchor |
| T33 | append_file | Any file | Append to end | Lines added at EOF |
| T34 | prepend_file | Any file | Prepend to start | Lines added at beginning |
| T35 | Hash mismatch | Wrong hash for line | Edit attempted | Error with corrective remap suggestions |
| T36 | Overlapping ranges | Two replace_range ops overlap | Validation | Error: overlapping ranges detected |
| T37 | Insert inside replaced range | append_at targeting line in a replace_range | Validation | Error: insert inside replaced range |
| T38 | Empty edits array | `edits: []` | Execute | Error: empty edits |
| T39 | File not found (create mode) | Non-existent file, ALL ops are append/prepend_file | Execute | File created |
| T40 | File not found (edit mode) | Non-existent file, has replace_line op | Execute | Error: file not found |
| T41 | Deletion via null lines | `lines: null` with replace_range | Execute | Lines deleted |
| T42 | String lines split | `lines: "line1\nline2"` | Execute | Split by `\n`, treated as array |
| T43 | Duplicate edits | Two identical operations | Execute | Silently deduplicated |
| T44 | All-noop edits | Replacement content same as existing | Execute | Error: all edits are no-ops |
| T45 | Line 0 rejected | `pos: "0#XJ"` | Validation | Error: line 0 invalid |
| T46 | Tolerant parser strips prefixes | `pos: ">42#VK"` or `"+42#VK"` | Parsing | Strips `>`, `+`, `-` prefixes, uses 42#VK |
| T47 | Bottom-up sort | Multiple edits at different lines | Application | Applied bottom-up to preserve line numbers |
| T48 | Hash alphabet | Hash characters | Validation | Only `ZPMQVRWSNKTXJBYH` characters accepted |

### 2.6 LSP Tools (6 tools)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T49 | goto_definition found | Symbol with definition | Execute | Returns file location |
| T50 | goto_definition not found | No definition | Execute | Returns `"No definition found"` |
| T51 | find_references found | Symbol with references | Execute | Returns all reference locations |
| T52 | find_references empty array | Symbol exists but no refs | Execute | Returns `"No references found"` |
| T53 | symbols document scope | File with symbols | `scope: "document"` | Returns document symbols |
| T54 | symbols workspace scope | Workspace query | `scope: "workspace", query: "foo"` | Returns workspace-wide symbols |
| T55 | symbols workspace without query | `scope: "workspace"` with no query | Execute | Hand-coded validation rejects |
| T56 | diagnostics with severity filter | File with mixed diagnostics | `severity: "error"` | Only errors returned |
| T57 | diagnostics with extension | Directory | `extension: ".ts"` | Searches .ts files in directory |
| T58 | prepare_rename valid | Renameable symbol | Execute | Returns rename range |
| T59 | prepare_rename invalid | Non-renameable position | Execute | Returns `"Rename is not valid at this position"` |
| T60 | rename with empty newName | `newName: ""` | Execute | Passes Zod validation (potential bug) |
| T61 | LSP client unavailable | No LSP server | Any LSP tool | Returns `"LSP client method unavailable"` |
| T62 | Float line numbers | `line: 1.5` | Execute | Accepted (no `.int()` in schema — potential bug) |
| T63 | Dispatch strategy fallback | Primary method unavailable | Execute | Falls through 5-strategy chain |
| T64 | Prepare_rename returns [] | Empty array result | Execute | JSON-formatted (inconsistency with other tools) |
| T65 | `unwrapClientResponse` with `error: 0` | Response has falsy error | Execute | Should not throw (0 is falsy) |

### 2.7 delegate_task

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T66 | Background task launch | `run_in_background: true` | Execute | Returns task_id, status=running |
| T67 | Sync task execution | `run_in_background: false` | Execute | Returns task result inline |
| T68 | Unknown category | `category: "nonexistent"` | Execute | Returns error with available categories list |
| T69 | Session resume (sync) | `session_id: "ses_xxx"` | Execute sync | Resumes existing session |
| T70 | Session resume (background) | `session_id: "ses_xxx", run_in_background: true` | Execute | Returns error: session_id not supported for background |
| T71 | Depth at limit | Agent at depth=2 | Delegates | Returns `"Delegation blocked: maximum depth (2) reached"` |
| T72 | Depth unknown (API error) | `extractDelegationDepth` throws | Delegates | Returns `"Delegation blocked: unable to determine depth"` |
| T73 | Depth 0 (root) | Orchestrator session | Delegates | Allowed; injects `depth=1` marker |
| T74 | Depth 1 (specialist) | Depth-1 agent | Delegates | Allowed; injects `depth=2` marker |
| T75 | No depth marker found | Session with no marker | `extractDelegationDepth()` | Returns 0 (assumes root) |
| T76 | Client unavailable | Neither tool context nor stored context has client | Execute | Throws Error |
| T77 | Metadata emission timing | Background task launched | First metadata before session, second after | Both emitted; second has sessionId |
| T78 | waitForSessionId timeout | Session creation delayed >5s | `waitForSessionId()` | Returns undefined after 5s |
| T79 | Sync poll timeout | Task takes >55s | `pollForResult()` | Returns timeout message with session ID |
| T80 | Sync stability detection | Message count stable for 3 polls | Poll loop | Returns last assistant message |
| T81 | Category with prompt_append | Category has prompt_append | Build prompt | Appended to user prompt |
| T82 | Empty subagent_type | `subagent_type: ""` | `deriveSubagent()` | Falls back to category name |

### 2.8 background_output

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T83 | Task completed | Task in completed state | `background_output(task_id)` | Returns result |
| T84 | Task running, no block | Task in running state, `block: false` | Execute | Returns status immediately |
| T85 | Task running, block until complete | Task completes within timeout | `block: true, timeout: 30000` | Returns result after completion |
| T86 | Task running, block timeout | Task doesn't complete | `block: true, timeout: 5000` | Returns current status after timeout |
| T87 | Task not found | Invalid task_id | Execute | Returns error message |
| T88 | Task cancelled | Task in cancelled state | Execute | Returns `"Task was cancelled"` |
| T89 | Task failed | Task in failed state | Execute | Returns error details |
| T90 | full_session mode | Completed task with session | `full_session: true` | Returns formatted session messages |
| T91 | message_limit cap | `message_limit: 150` | Execute | Capped at 100 |
| T92 | since_message_id | Valid message ID | Execute | Returns messages after that ID |
| T93 | since_message_id not found | Invalid message ID | Execute | Returns all messages (filter returns -1) |
| T94 | thinking_max_chars | Long thinking block | `thinking_max_chars: 100` | Thinking truncated to 100 chars |
| T95 | Empty task result fallback | Task completed but result empty | Execute | Falls back to session last-assistant-message |

### 2.9 background_cancel

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T96 | Cancel specific task | Running task | `task_id: "task_xxx"` | Task cancelled, returns success |
| T97 | Cancel all | Multiple running tasks | `all: true` | All running/queued tasks cancelled |
| T98 | Cancel already completed | Task in completed state | `task_id: "task_xxx"` | Returns error: cannot cancel terminal state |
| T99 | Cancel non-existent | Invalid task_id | Execute | Returns error: task not found |
| T100 | No args | Neither task_id nor all | Execute | Returns error: invalid arguments |
| T101 | All with no running tasks | No running/queued tasks | `all: true` | Returns "No running or queued tasks" |
| T102 | Cancel all only cancels own children (PROPOSED FIX) | Depth-1 agent calls `all=true` | Execute | Only cancels tasks with matching parentSessionID |

### 2.10 Session Manager Tools (4 tools)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T103 | session_list default | Sessions exist | `session_list()` | Returns up to 20 sessions sorted by updated desc |
| T104 | session_list with limit | `limit: 5` | Execute | Returns at most 5 sessions |
| T105 | session_list date filter | `from_date: "2026-01-01"` | Execute | Only sessions after that date |
| T106 | session_list invalid date | `from_date: "not-a-date"` | Execute | NaN comparison → silently returns empty (BUG) |
| T107 | session_list filters child sessions | Parent + child sessions exist | Execute | Child sessions (with parentID) excluded |
| T108 | session_read basic | Valid session with messages | `session_read(session_id)` | Returns formatted messages |
| T109 | session_read with limit | `limit: 3` | Execute | Returns first 3 messages (not last 3) |
| T110 | session_read limit=0 | `limit: 0` | Execute | Returns all messages |
| T111 | session_read include_todos | `include_todos: true` | Execute | Todos appended to output |
| T112 | session_read include_transcript | `include_transcript: true` | Execute | **DEAD PARAMETER** — declared but never used |
| T113 | session_read thinking truncation | Message with long thinking | Execute | Truncated to 200 chars |
| T114 | session_read tool input truncation | Message with long tool JSON | Execute | Truncated to 100 chars |
| T115 | session_search found | Query matches messages | Execute | Returns excerpts with context |
| T116 | session_search no matches | Query matches nothing | Execute | Returns "No matches found" |
| T117 | session_search empty query | `query: " "` | Execute | Returns "No matches found" (not error) |
| T118 | session_search timeout | 50+ sessions, slow scan | Execute | Times out after 60s |
| T119 | session_search case sensitive | `case_sensitive: true` | Execute | Exact case matching |
| T120 | session_info basic | Valid session | Execute | Returns metadata (messages, dates, agents, todos) |
| T121 | session_info hasTranscript | Any session | Execute | Always returns false (hardcoded) |

### 2.11 Task Management Tools (4 tools)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T122 | task_create basic | Valid subject | Execute | Returns created task with UUID |
| T123 | task_create empty subject | `subject: ""` | Execute | Succeeds (no validation on content) |
| T124 | task_create defaults | No priority/status | Execute | Defaults: priority=medium, status=pending |
| T125 | task_get found | Existing task ID | Execute | Returns full task details |
| T126 | task_get not found | Invalid ID | Execute | Returns "Task not found" |
| T127 | task_get empty string | `id: ""` | Execute | Returns "Task not found" |
| T128 | task_list all | Tasks exist | `task_list()` | Returns all tasks in compact format |
| T129 | task_list filter status | `status: "completed"` | Execute | Only completed tasks |
| T130 | task_list filter priority | `priority: "high"` | Execute | Only high priority tasks |
| T131 | task_list dual filter | `status: "pending", priority: "high"` | Execute | AND logic: pending AND high |
| T132 | task_list no results | No matching tasks | Execute | Returns empty list message |
| T133 | task_update basic | Existing task, `status: "completed"` | Execute | Status updated, updatedAt set |
| T134 | task_update no-op | Existing task, no optional fields | Execute | Still bumps `updatedAt` |
| T135 | task_update not found | Invalid ID | Execute | Returns error |
| T136 | task_update backward transition | `completed → pending` | Execute | Allowed (no transition validation) |
| T137 | task_update can't clear content | Task with content, `content: undefined` | Execute | Content remains (can't clear to undefined) |
| T138 | task store volatility | Tasks created, process restarts | Execute | All tasks lost (in-memory only) |

### 2.12 skill

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T139 | Load existing skill | `git-gud` skill registered | `skill(name: "git-gud")` | Returns skill content |
| T140 | Skill not found | Unknown skill name | Execute | Returns error message |
| T141 | No loader registered | `registeredLoader` is null | Execute | Returns error |
| T142 | Empty string from loader | Loader returns `""` | Execute | Treated as valid (truthy check: `content !== undefined`) |
| T143 | Loader throws | Loader function throws Error | Execute | Unhandled — propagates |

### 2.13 look_at

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T144 | Image file | Valid PNG path | Execute | Sends to advisor session with binary encoding |
| T145 | PDF file | Valid PDF path | Execute | Sends with `application/pdf` mime |
| T146 | Text file | Valid .ts file | Execute | Content embedded in prompt (no truncation) |
| T147 | SVG file | .svg file | Execute | Treated as binary (extension-based) |
| T148 | Both inputs provided | `file_path` AND `image_data` | Execute | Returns error: exactly one required |
| T149 | Neither input | No file_path, no image_data | Execute | Returns error |
| T150 | Raw base64 without data URI | Base64 string (no `data:` prefix) | Execute | Defaults to `image/png` |
| T151 | Large file | Multi-MB text file | Execute | Entire file loaded (no size limit — potential issue) |

---

## 3. Hooks

### 3.1 Context Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H1 | agents-injector first read | Read tool, AGENTS.md exists in directory | After read | Full AGENTS.md content appended |
| H2 | agents-injector subsequent read (same dir) | Same directory read again | After read | Short back-reference appended (not full content) |
| H3 | agents-injector no AGENTS.md | Read tool, no AGENTS.md in tree | After read | Nothing appended |
| H4 | agents-injector undefined title | Read output with no title | After read | Early return (no append) |
| H5 | agents-injector no sessionID | Tool context missing sessionID | After read | Uses `"__default"` key for dedup tracking |
| H6 | readme-injector | Read tool, README.md exists | After read | README content appended |
| H7 | readme-injector repeated | Same directory read twice | After read | README injected BOTH times (no dedup) |
| H8 | rules-injector | `.rules` and/or `RULES.md` exist | System transform | Content appended to system output |
| H9 | rules-injector no files | Neither file exists | System transform | Early return |
| H10 | compaction-context snapshot | `session.compacted` event | System transform follows | Snapshot injected then deleted (one-shot) |
| H11 | compaction-context truncation | `.sisyphus/todos.md` > 4000 chars | Event | Truncated to 4000 chars |
| H12 | compaction-context no todos or plans | No `.sisyphus/` files | Event | Null snapshot, nothing stored |
| H13 | phase-reminder orchestrator | Last user message for orchestrator | Messages transform | Reminder prepended to message text |
| H14 | phase-reminder non-orchestrator | Last user message for explorer | Messages transform | No reminder added |
| H15 | phase-reminder idempotent | Message already has reminder | Messages transform | No duplicate reminder |
| H16 | skill-discovery with skills | Skills available | System transform | Skills list appended to system |
| H17 | skill-discovery no skills | No skills loaded | System transform | Early return |

### 3.2 Recovery Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H18 | edit-error: oldString not found | Edit tool returns "oldString not found" | After edit | Recovery message appended |
| H19 | edit-error: multiple matches | Edit returns "found multiple times" | After edit | Recovery message appended |
| H20 | edit-error: same old and new | Edit returns "must be different" | After edit | Recovery message appended |
| H21 | edit-error: non-edit tool | Grep tool with similar output | After tool | No recovery (wrong tool) |
| H22 | edit-error: idempotent | Output already has recovery marker | After edit | No duplicate |
| H23 | json-error: JSON parse error | Output has "unexpected token" | After tool | JSON recovery appended |
| H24 | json-error: expected JSON content | Title says "json", content starts with `{` but invalid | After tool | Recovery appended |
| H25 | json-error: valid JSON | Title says "json", content is valid JSON | After tool | No recovery |
| H26 | session-recovery: crash pattern | Error matches "session.*crash" | Event | Recovery context set |
| H27 | session-recovery: non-matching error | Error is "rate limit exceeded" | Event | No recovery (different hook handles this) |
| H28 | session-recovery: existing context | Event already has recoveryContext | Event | Appends to existing context |
| H29 | context-window-limit: 90% usage | `contextWindowUsage: 0.9` on idle | Event | Recovery actions: compact, summarize |
| H30 | context-window-limit: percentage format | `contextWindowUsage: 95` (>1) | Event | Divided by 100 → treated as 0.95 |
| H31 | context-window-limit: token limit error | Error "maximum context length exceeded" | Error event | Recovery context set |
| H32 | error-diagnostics: rate limit | Output "429 Too Many Requests" | After tool | Diagnostic block appended |
| H33 | error-diagnostics: long output | Output > 1500 chars | After tool | SKIPPED (avoids false positives) |
| H34 | error-diagnostics: event error | `session.error` with "permission denied" | Event | `recoveryContext` set |
| H35 | error-diagnostics: pattern priority | Output matches both rate-limit and auth | After tool | First match wins (rate-limit) |

### 3.3 Model Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H36 | model-fallback: rate limit | 429 error on session | Event | Switches to next model in chain |
| H37 | model-fallback: service unavailable | 503 error | Event | Switches to next model |
| H38 | model-fallback: no sessionID | Error event without sessionID | Event | Early return (no fallback) |
| H39 | model-fallback: no eligible model | All fallback models unavailable | Event | Returns without switching |
| H40 | model-fallback: next same as current | Only one model in chain | Event | No-op (no switch) |
| H41 | runtime-fallback: model not found | "model not found" error | Event | Switches to available model |
| H42 | runtime-fallback: context exceeded | "context length exceeded" | Event | Switches to model with larger context |
| H43 | runtime-fallback: same provider first | Current model is anthropic | Event | Tries anthropic models first, then cross-provider |
| H44 | preemptive-compaction: threshold reached | Token usage ≥ 80% | Event | `compactSession` called |
| H45 | preemptive-compaction: already compacted | Same session above threshold again | Event | No re-compaction (Set tracks) |
| H46 | preemptive-compaction: drops below threshold | Usage drops, then rises again | Event | Cleared from Set, re-compaction allowed |
| H47 | preemptive-compaction: compaction failure | `compactSession` throws | Event | Removed from Set (allows retry) |
| H48 | preemptive-compaction: no contextLimit | `contextLimit: 0` or missing | Event | Early return |

### 3.4 Quality Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H49 | comment-checker: empty catch block | Write tool with `catch (e) {}` | Before tool | Warning appended |
| H50 | comment-checker: catch with body | `catch (e) { log(e) }` | Before tool | No warning |
| H51 | comment-checker: non-write tool | Read tool with empty catch | Before tool | No warning (wrong tool) |
| H52 | write-file-guard: read then write | Read file, then write same file | Pre-tool-use | Write allowed |
| H53 | write-file-guard: write without read | Write to existing file, no prior read | Pre-tool-use | **Throws Error** blocking write |
| H54 | write-file-guard: new file | Write to non-existent file | Pre-tool-use | Write allowed (new file always OK) |
| H55 | write-file-guard: .sisyphus/ path | Write to `.sisyphus/` file | Pre-tool-use | Always allowed (exempt path) |
| H56 | write-file-guard: read consumed | Read file A, write file A, write file A again | Second write | **Throws Error** (read consumed on first write) |
| H57 | write-file-guard: session cleanup | `session.deleted` event | Event | Session tracking state cleaned |
| H58 | write-file-guard: 256 session limit | 257th session | Track | Oldest session evicted |
| H59 | write-file-guard: 1024 path limit | 1025th path in session | Track | Oldest path evicted (Set iteration order) |
| H60 | thinking-block-validator: malformed thinking | Assistant message with empty thinking part | Messages transform | Empty thinking part removed |
| H61 | thinking-block-validator: valid thinking | Assistant message with content in thinking | Messages transform | Kept as-is |
| H62 | tool-pairing-validator: orphaned tool_use | Tool_use without matching tool_result | Messages transform | Orphaned part removed |
| H63 | tool-pairing-validator: orphaned tool_result | Tool_result referencing non-existent tool_use ID | Messages transform | Orphaned part removed |
| H64 | tool-pairing-validator: paired correctly | Matching tool_use + tool_result | Messages transform | Both kept |

### 3.5 Productivity Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H65 | keyword-detector: ultrawork | User says "ultrawork" | Chat message | Session mode set to "ultrawork" |
| H66 | keyword-detector: ulw shorthand | User says "ulw do this" | Chat message | Session mode set to "ultrawork" |
| H67 | keyword-detector: in code block | User says `` `ultrawork` `` in backticks | Chat message | NOT detected (code blocks stripped) |
| H68 | keyword-detector: deep-think | User says "deep-think" | Chat message | Session mode set to "think" |
| H69 | keyword-detector: fast | User says "fast fix this" | Chat message | Session mode set to "fast" |
| H70 | keyword-detector: priority | Message has both "ultrawork" and "fast" | Chat message | "ultrawork" wins (first match) |
| H71 | think-mode: Claude model | Mode=think, Anthropic model | Chat params | `options.thinking` set with 10000 budget |
| H72 | think-mode: non-Claude | Mode=think, OpenAI model | Chat params | No thinking injection |
| H73 | think-mode: already set | `options.thinking` already defined | Chat params | Skipped (no override) |
| H74 | anthropic-effort: medium | Claude, effort=medium | Chat params | Thinking budget=5000 |
| H75 | anthropic-effort: max on Opus | Claude Opus, effort=max | Chat params | Budget=32000 + `options.effort = "max"` |
| H76 | anthropic-effort: low | effort=low | Chat params | No-op |
| H77 | ultrawork-mode: Claude | Mode=ultrawork, Claude | Chat params | Thinking injected + system context with `<ultrawork-mode>` |
| H78 | ultrawork-mode: non-Claude | Mode=ultrawork, GPT | Chat params | Only system context (no thinking) |
| H79 | ultrawork-mode: idempotent | System already has `<ultrawork-mode>` | Chat params | No duplicate injection |

### 3.6 Output Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H80 | tool-output-truncator: large output | Grep returns >51200 bytes | After tool | Written to temp file, truncated in-place |
| H81 | tool-output-truncator: >2000 lines | Glob returns 2500 lines | After tool | Truncated to 2000 lines + notice |
| H82 | tool-output-truncator: non-truncatable tool | Read tool with large output | After tool | Not truncated (read not in truncatable set) |
| H83 | tool-output-truncator: case sensitivity | Tool named "Bash" vs "bash" | After tool | Both are in the set (both listed) |
| H84 | hashline-read-enhancer: read tool | Standard read output `1: content` | After read | Transformed to `1#HASH\|content` |
| H85 | hashline-read-enhancer: write tool | Write completes | After write | Replaced with concise `"File written. N lines."` |
| H86 | hashline-read-enhancer: write error | Write output starts with "error" | After write | Kept unchanged |
| H87 | hashline-read-enhancer: truncated line | Line ending with "... (line truncated)" | After read | No hash added for truncated lines |
| H88 | hashline-read-enhancer: non-text file | Binary content (first line doesn't match) | After read | Returned unchanged |
| H89 | hashline-diff-enhancer: before capture | Write tool invoked | Before write | Old file content captured and stored |
| H90 | hashline-diff-enhancer: stale cleanup | Captures older than 5 minutes | Next before call | Stale entries cleaned |
| H91 | hashline-diff-enhancer: no before capture | After write without matching before | After write | Returns without diff metadata |

### 3.7 Continuation Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H92 | todo-enforcer: pending todos | Session idle, pending todos exist | Event | Continuation message injected |
| H93 | todo-enforcer: all complete | Session idle, all todos completed | Event | No injection (idle legitimate) |
| H94 | todo-enforcer: no sessionID | Idle event without sessionID | Event | Early return |
| H95 | compaction-todo-preserver: with todos | Session compacting, todos exist | Event | Full todo snapshot prepended to context |
| H96 | compaction-todo-preserver: all statuses | Completed + cancelled + pending todos | Event | ALL statuses included in snapshot |
| H97 | stop-guard: stop with pending todos | User says "I'm done", pending todos exist | Chat message | Stop guard message injected |
| H98 | stop-guard: stop with complete todos | User says "task complete", all done | Chat message | No injection (stop allowed) |
| H99 | stop-guard: no stop pattern | User says "continue" | Chat message | No injection |
| H100 | foreground-fallback: rate limit | Session error with 429 | Event | Retry with fallback model |
| H101 | foreground-fallback: dedup window | Same session+model within 5s | Event | Second trigger ignored |
| H102 | foreground-fallback: concurrent lock | Same session being processed | Event | Ignored (inProgress Set) |
| H103 | foreground-fallback: no fallback available | All models exhausted | Event | Logs and returns |
| H104 | foreground-fallback: cleanup | >100 entries in lastTrigger map | Event | Entries >5min cleaned |

### 3.8 Task Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H105 | delegate-retry: missing run_in_background | Task error "[ERROR] Invalid arguments" | After tool | Retry guidance with fix hint |
| H106 | delegate-retry: unknown category | "Unknown category" in output | After tool | Lists available categories |
| H107 | delegate-retry: non-task tool | Non-task tool with "[ERROR]" output | After tool | Ignored (wrong tool) |
| H108 | empty-response-detector: null output | Task tool returns null | After tool | Warning injected explaining silent failure |
| H109 | empty-response-detector: near-empty | Task returns "ok" (< 10 chars) | After tool | Warning injected |
| H110 | empty-response-detector: normal output | Task returns full result | After tool | No modification |
| H111 | task-resume-info: session_id extraction | Task output with `<task_metadata>` block | After tool | Session ID extracted, continuation line added |
| H112 | task-resume-info: error output | Task output starting with "Error:" | After tool | Skipped (error outputs not enhanced) |
| H113 | todowrite-disabler: subagent | Non-orchestrator calls TodoWrite | Before tool | **Throws Error** blocking call |
| H114 | todowrite-disabler: orchestrator | Orchestrator calls TodoWrite | Before tool | Allowed through |
| H115 | todowrite-disabler: undefined agent | Agent name undefined | Before tool | Allowed (not subagent) |

### 3.9 Nudge Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| H116 | post-read-nudge: below threshold | 1st-2nd read/grep/glob | After read | Gentle workflow reminder |
| H117 | post-read-nudge: at threshold | 3rd+ exploration call | After read | Escalated DELEGATION_NUDGE |
| H118 | post-read-nudge: grep counts but no nudge | 3rd call is grep not read | After grep | Counter incremented but NO nudge appended (only read gets nudge) |
| H119 | post-read-nudge: idempotent | Output already contains nudge | After read | No duplicate |

---

## 4. Features

### 4.1 Background Agent System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| F1 | Task lifecycle: queued → running → completed | Task launched | Session idles with content | Status transitions correctly |
| F2 | Task lifecycle: queued → cancelled | Task queued, then cancelled | Cancel before start | Status=cancelled, slot not released (was never acquired) |
| F3 | Task lifecycle: running → failed | Session errors | Error event fires | Status=failed, concurrency released |
| F4 | Concurrent cancel during spawn | Cancel called while `spawnBackgroundSession` in-flight | Spawn completes | Session detected as cancelled, deleted |
| F5 | Session idle with 0 messages before MIN_IDLE_TIME | Idle event < 5s after start, no messages | Event | Ignored (too early) |
| F6 | Session idle with 0 messages after MIN_IDLE_TIME | Idle event > 5s after start, still 0 messages | Event | Task failed: "no output" |
| F7 | Last message is tool result, not assistant | Session idle, last msg is tool_result | Event | Not completed (waits for next idle) |
| F8 | Multiple waitForCompletion callers | 3 callers await same task | Task completes | All 3 notified |
| F9 | waitForCompletion timeout | Caller waits 5s, task not done | Timeout expires | Resolves with current task state |
| F10 | Task TTL eviction | Completed task, 5+ minutes pass | Next eviction check | Task removed from map |
| F11 | dispose() with pending waiters | Callers blocking, dispose called | Dispose | All waiters resolved with current state |
| F12 | Concurrency: 5 tasks on same model | 5 tasks launched for same model | 6th task | Queues behind (blocks in acquire) |
| F13 | Concurrency: release unblocks queue | Task completes, queued task waiting | Release | Next queued task starts |
| F14 | Concurrency: release at 0 count | `release()` called when count=0 | Execute | Count stays 0 (`Math.max(0, current-1)`) |
| F15 | Concurrency starvation | 4 parents hold slots, 17 children queue | Children | Only 1 child runs at a time (BUG — see retrospective) |
| F16 | Event-hook: unknown session idle | Idle event for non-background session | Event | `tasksBySessionId.get()` returns undefined, early return |
| F17 | Event-hook: manager not initialized | Idle event before background agent setup | Event | Catches "not initialized" error, returns |

### 4.2 Loop System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| F18 | Start loop | Session goes idle | Loop handler | `[SYSTEM DIRECTIVE: LOOP CONTINUE]` sent |
| F19 | Loop completion detection | Agent sends `<promise>DONE</promise>` | Idle event | Loop stops, completion detected |
| F20 | Max iterations reached | DEFAULT_MAX_ITERATIONS (100) | Iteration 100 | Loop stops |
| F21 | Unbounded max | `maxIterations: 1000` | Execute | Runs up to 1000 iterations |
| F22 | Invalid maxIterations: 0 | `maxIterations: 0` | `createInitialLoopState()` | `RangeError` |
| F23 | Invalid maxIterations: NaN | `maxIterations: NaN` | Execute | `RangeError` |
| F24 | Invalid maxIterations: Infinity | `maxIterations: Infinity` | Execute | `RangeError` (not safe integer) |
| F25 | Routed store: persist=true | `persist: true` | Start | Uses FileLoopStore |
| F26 | Routed store: persist=false | `persist: false` | Start | Uses MemoryLoopStore |
| F27 | Routed store: switch stores | Start with memory, then start with persist | Second start | Stops memory store first, then starts file store |
| F28 | File store: invalid JSON on disk | Corrupted `.sisyphus/loop-state.json` | Load | Logs error, continues with empty state |
| F29 | File store: invalid shape on disk | Valid JSON but wrong shape | Load | Skips invalid entries, continues |
| F30 | File store: atomic write | Write during concurrent read | Race condition | Temp file + rename prevents corruption |
| F31 | Memory store: returns clones | Get state, modify returned object | Original | Original unchanged (cloned) |
| F32 | Stop non-existent loop | `stopLoop("nonexistent")` | Execute | No-op, no error |

### 4.3 Skills System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| F33 | Load builtin git-gud | Skills loaded | Query `git-gud` | Returns comprehensive git workflow guide |
| F34 | Load project skill | `.opencode/skills/my-skill.md` exists | Load | Parsed and available |
| F35 | No skills directory | `.opencode/skills/` doesn't exist | Load | Returns empty array |
| F36 | Skill with no frontmatter | Markdown file without `---` markers | Load | Name from filename, empty description |
| F37 | Skill with only frontmatter | File has frontmatter but empty body | Load | Skipped (empty template) |
| F38 | Non-.md files | `.txt` file in skills directory | Load | Ignored |
| F39 | Project overrides builtin | Both builtin and project have `git-gud` | Merge | Project version wins |
| F40 | Frontmatter colons in description | `description: key: value with: colons` | Parse | First colon is separator, rest is value |
| F41 | Skill sync to disk | Built-in skill loaded | Sync | Written to `~/.local/share/goatcode-sh/skills/git-gud/SKILL.md` |

### 4.4 Categories System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| F42 | Resolve known category | `category: "deep"` | `resolveCategory()` | Returns config: model=gpt-5.3-codex, variant=medium |
| F43 | Resolve unknown category | `category: "unknown"` | `resolveCategory()` | Returns `undefined` |
| F44 | Category config override | Config overrides `deep.model` | Resolve | Overridden model used |
| F45 | All 8 categories exist | Check all names | Resolve each | visual-engineering, ultrabrain, deep, artistry, quick, unspecified-low, unspecified-high, writing |
| F46 | Category with prompt_append | Category has prompt_append | Delegation | Appended to child prompt |
| F47 | Category fallback chain | Provider disconnected for category model | Resolve | Falls back through chain |

### 4.5 Prompt Builder

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| F48 | Build orchestrator prompt | All agents/skills/categories available | `buildDynamicPrompt()` | Base prompt + agent table + skills + categories |
| F49 | Empty agents | No agents registered | Build | Agent table section omitted |
| F50 | Empty skills | No skills loaded | Build | Skills section omitted |
| F51 | Agent description with pipe | Description contains `|` | Agent table | Pipe escaped in markdown table |
| F52 | Skill with multiline description | Skill has newlines in description | Skill section | Collapsed to single line |
| F53 | Agent description truncation | Long description with multiple sentences | Agent table | Truncated at first `.` |

### 4.6 Auto-Update

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| F54 | First session triggers check | `session.created` event, first process | Event | Update check runs |
| F55 | Subsequent sessions skip | `session.created` after first check | Event | No check (once-per-process) |
| F56 | auto_update disabled | Config `auto_update: false` | Event | Check skipped |
| F57 | Update available | New version exists | Check | Notification shown |
| F58 | Already up to date | Same version | Check | Silent (no notification) |
| F59 | Check failure | Network error during check | Check | Logged, no crash |

---

## 5. Configuration

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| C1 | Project config loads | `goatcode.config.ts` exists | Bootstrap | Config loaded and validated |
| C2 | User config loads | `~/.config/opencode/goatcode.ts` exists | Bootstrap | Merged with project config |
| C3 | Both configs merge | User and project configs overlap | Merge | Project config wins on conflicts |
| C4 | Legacy config detected | `ochead.config.ts` exists | Load | Used with deprecation warning |
| C5 | Invalid config | Zod validation fails | Load | Returns `null`, graceful fallback |
| C6 | Config exports function | `export default () => ({...})` | Load | Function called, result used |
| C7 | Config exports async function | `export default async () => ({...})` | Load | Awaited, result used |
| C8 | Partial config | Only `agents.orchestrator.model` set | Validate | Zod defaults fill other fields |
| C9 | Temperature out of range | `default_temperature: 3` | Validate | Zod rejects (0-2 range) |
| C10 | GOATCODE_CONFIG_DIR override | Env var set | User config load | Uses env var path instead of default |
| C11 | ensureUserConfig concurrent | Two processes call simultaneously | Both | First succeeds (`wx` flag), second handles EEXIST |
| C12 | disabled_hooks | `disabled_hooks: ["phase-reminder"]` | Aggregation | Phase reminder excluded |
| C13 | disabled_tools | `disabled_tools: ["hashline_edit"]` | Aggregation | Hashline edit excluded |

---

## 6. Plugin Architecture

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| P1 | Plugin registration | Valid PluginDefinition | `registry.register()` | Plugin added |
| P2 | Plugin dependency resolution | Plugin A depends on Plugin B | `registry.resolve()` | B loaded before A |
| P3 | Circular dependency | A → B → A | `registry.resolve()` | Error or handled gracefully |
| P4 | Plugin setup runs | Plugin with `setup()` | `registry.setup()` | Setup called with OpenCodeContext |
| P5 | Plugin aggregation | All plugins registered | `registry.aggregate()` | Merged tools/hooks/agents |
| P6 | Config hook ordering | Compositor config hook + registered hooks | Config event | Compositor hook runs first |
| P7 | Hook handler isolation | One hook throws Error | Composition | Other hooks continue (per-handler catch) |
| P8 | Tool name conflict | Two plugins register same tool name | Aggregate | Last one wins (shallow copy) |
| P9 | Compositor first run | No provider cache | Config hook | Model assignment skipped |
| P10 | Compositor disables built-in agents | Bootstrap | Config hook | `build` and `plan` agents disabled |
| P11 | External plugin loading | `config.plugins: ["my-plugin"]` | Bootstrap | Package imported and registered |

---

## 7. Provider Discovery & Model Resolution

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| PR1 | Discovery builds index | Provider list response | `buildDiscoveryIndex()` | connectedProviders Set + modelIndex Map + providerModels Map |
| PR2 | Discovery timeout | Provider list takes >15s | Bootstrap | Timeout, continues without discovery |
| PR3 | Provider names normalized | Provider `"Anthropic"` | Discovery | Stored as `"anthropic"` (lowercase) |
| PR4 | Model resolution: explicit override | `override: "anthropic/claude-opus-4-6"` | `resolveModel()` | Returns override directly |
| PR5 | Model resolution: fallback chain walk | First provider disconnected | `resolveModel()` | Returns second match |
| PR6 | Model resolution: first-run null | Connected providers = null | `resolveModel()` | Returns undefined |
| PR7 | Connected providers cache: disk read | Cache file exists | `readConnectedProviders()` | Returns from disk |
| PR8 | Connected providers cache: memory priority | Both memory and disk cache | Read | Memory cache returned (no disk I/O) |
| PR9 | Connected providers cache: invalid JSON | Corrupted cache file | Read | Returns null, continues |
| PR10 | Connected providers cache: atomic write | Write during concurrent read | Race | Temp file + rename prevents corruption |
| PR11 | Model normalization: undefined | `normalizeModel(undefined)` | Execute | Returns `undefined` |
| PR12 | Model normalization: empty | `normalizeModel("")` | Execute | Returns `undefined` |
| PR13 | parseModelId: no slash | `parseModelId("claude-opus")` | Execute | Returns `undefined` |
| PR14 | parseModelId: with slash | `parseModelId("anthropic/claude-opus")` | Execute | Returns `{ provider: "anthropic", modelId: "claude-opus" }` |
| PR15 | Model availability: prefix match | Available: `"gpt-5.4"`, check `"gpt-5"` | `isModelAvailable()` | Returns true (separator match with `-`) |
| PR16 | Model availability: empty set | No available models | `isModelAvailable()` | Returns true (permissive fallback) |
| PR17 | resolveQualifiedModel | Already-qualified model string | Runtime fallback | Checks availability, finds alternative if unavailable |

---

## 8. Delegation System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| D1 | Depth enforcement tree | User→Orch(0)→Specialist(1)→Sub(2) | Sub tries to delegate | Blocked at depth 2 |
| D2 | Depth marker injection | Orchestrator delegates | Child prompt | Contains `<!-- goatcode:delegation_depth=1 -->` |
| D3 | Depth marker in first 3 messages | Session with 10 messages, marker in msg 1 | Extract | Found (only checks first 3) |
| D4 | Depth marker absent | Session with no marker | Extract | Returns 0 (assumes root) |
| D5 | Depth extraction API error | `session.messages()` throws | Extract | Returns null → delegation blocked |
| D6 | Sync vs background routing | `run_in_background: true/false` | Handler | Correct executor called |
| D7 | Category prompt_append | Category has `prompt_append` | Execute | Appended to user's prompt |
| D8 | Session continuation | `session_id` on sync task | Execute | Existing session resumed, not new |

---

## 9. CLI

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| CL1 | `goatcode install` | Fresh directory | Run command | `goatcode.config.ts` generated |
| CL2 | `goatcode install --force` | Config already exists | Run command | Config overwritten |
| CL3 | `goatcode install --non-interactive` | CI environment | Run command | No prompts, uses defaults |
| CL4 | `goatcode update` | New version available | Run command | Update installed |
| CL5 | Config generator: agent stubs | Generate project config | Check file | All 7 agent names as commented stubs |
| CL6 | Config generator: category stubs | Generate project config | Check file | All 8 category names as commented stubs |
| CL7 | User config generator | Generate user config | Check file | Includes provider_priority, agent overrides |

---

## 10. Cross-Cutting Scenarios

### 10.1 State Isolation

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| X1 | Task store reset | Tests use `resetTaskStore()` | Between tests | Fresh empty store |
| X2 | Connected providers cache reset | Tests use `resetConnectedProvidersCache()` | Between tests | Fresh cache |
| X3 | Keyword detector state | `clearSessionMode()` | Between tests | No leftover mode |
| X4 | Write-file-guard state | Session tracking across tests | Reset mechanism | Sessions cleaned up |
| X5 | Skill loader singleton | `registeredLoader` between tests | Reset | Previous loader not leaking |

### 10.2 Error Propagation

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| X6 | Tools return strings, never throw | Any tool error | Execute | Returns `"Error: ..."` string |
| X7 | Hooks that throw (blocking) | write-file-guard, todowrite-disabler | Before tool | Error prevents tool execution |
| X8 | Hooks that catch (non-blocking) | Most hooks | Throws internally | Caught, logged, other hooks continue |
| X9 | Plugin setup failure | Plugin `setup()` throws | Bootstrap | Error logged, other plugins continue |

### 10.3 Integration Scenarios

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| X10 | Full bootstrap pipeline | All plugins registered | Bootstrap completes | All agents, tools, hooks available |
| X11 | Background task → event → completion | Launch task, agent works, goes idle | Full cycle | Event routes to manager, task completes, waiter notified |
| X12 | Delegation → depth enforcement → execution | Orchestrator delegates, specialist sub-delegates | Full chain | Depth markers injected and enforced correctly |
| X13 | Config override → agent model change | Config has `agents.orchestrator.model: "gpt-5.4"` | Agent builds | Orchestrator uses GPT instead of Claude |
| X14 | Skill load → discovery → tool enhancement | Skill registered | System transform + tool definition | Skill listed in both prompt and tool description |

---

## Summary

| Category | Scenario Count |
|----------|---------------|
| Agents | 27 (A1-A27) |
| Tools | 89 (T1-T151) — heaviest section (23 tools) |
| Hooks | 55 (H1-H119) — 32 hooks |
| Features | 31 (F1-F59) — 6 features |
| Config | 13 (C1-C13) |
| Plugins | 11 (P1-P11) |
| Provider/Model | 17 (PR1-PR17) |
| Delegation | 8 (D1-D8) |
| CLI | 7 (CL1-CL7) |
| Cross-Cutting | 14 (X1-X14) |
| **Total** | **~272 scenarios** |
