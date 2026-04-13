# GoatCode Test Scenarios — Comprehensive Self-Executable Suite

Every scenario follows: **Given → When → Then** with edge cases. This file (`eval/TEST_SCENARIOS.md`) is the canonical scenario catalog.

---

## 1. Agents

### 1.1 Agent Registration & Plugin Metadata

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AGENTS-1-ALL_7_AGENTS_REGISTERED | All 7 agents registered | Bootstrap completes | `registry.getAgents()` | Returns exactly: orchestrator, deepworker, planner, advisor, researcher, explorer, worker |
| AGENTS-2-AGENT_PLUGIN_HAS_NAME_VERSION | Agent plugin has name/version | Agent plugin loaded | Read `name` and `version` | Non-empty string name, valid semver version |
| AGENTS-3-DISABLED_AGENTS_EXCLUDED | Disabled agents excluded | `disabled_agents: ["advisor"]` in config | `registry.aggregate()` | Advisor absent from aggregated agents |
| AGENTS-4-UNKNOWN_AGENT_IN_DISABLED_LIST | Unknown agent in disabled list | `disabled_agents: ["nonexistent"]` | Aggregation | No error; other agents unaffected |

### 1.2 Agent Modes

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AGENTS-5-ALL_MODE_AGENTS_ORCHESTRATOR_DEEPWORKER_PLANNER_ | `all` mode agents (orchestrator, deepworker, planner, researcher) | Agent in `all` mode | Queried as primary or subagent | Available in both contexts |
| AGENTS-6-SUBAGENT_MODE_AGENTS_ADVISOR_EXPLORER_WORKER | `subagent` mode agents (advisor, explorer, worker) | Agent in `subagent` mode | Queried as primary | Not available as primary |
| AGENTS-7-SUBAGENT_AGENTS_IGNORE_UI_MODEL | `subagent` agents ignore UI model | Explorer set as subagent | User selects different model in UI | Explorer still uses its own fallback chain |

### 1.3 Tool Restrictions

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AGENTS-8-ADVISOR_DENIED_TOOLS | Advisor denied tools | Advisor agent | Attempts `write`, `edit`, `bash`, `interactive_bash`, `delegate_task`, `task_create`, `task_update` | Each tool blocked |
| AGENTS-9-ADVISOR_ALLOWED_TOOLS | Advisor allowed tools | Advisor agent | Attempts `read`, `grep`, `glob` | Each tool allowed |
| AGENTS-10-EXPLORER_ALLOWED_ONLY_WHITELIST | Explorer allowed-only whitelist | Explorer agent | Attempts `read`, `glob`, `grep`, `lsp_*`, `ast_grep_search`, `look_at`, `todowrite` | All allowed |
| AGENTS-11-EXPLORER_DENIED_BY_OMISSION | Explorer denied-by-omission | Explorer agent | Attempts `write`, `edit`, `bash`, `delegate_task` | Each tool blocked |
| AGENTS-12-ORCHESTRATOR_FULL_ACCESS | Orchestrator full access | Orchestrator agent | Attempts any tool | All tools available |
| AGENTS-13-CONFIG_DENIED_TOOLS_OVERRIDE | Config denied_tools override | Agent config adds `denied_tools: ["bash"]` | Agent attempts `bash` | Blocked even if not in base restrictions |
| AGENTS-14-EMPTY_DENIED_TOOLS | Empty denied_tools | Agent with `denied_tools: []` | Any tool | All tools available |
| AGENTS-15-UNKNOWN_TOOL_IN_DENIED_LIST | Unknown tool in denied list | `denied_tools: ["nonexistent_tool"]` | Build tools map | No error; known tools unaffected |

### 1.4 Fallback Chains

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AGENTS-16-FIRST_PROVIDER_CONNECTED | First provider connected | Anthropic connected | Resolve orchestrator model | Returns `anthropic/claude-opus-4-6` |
| AGENTS-17-FIRST_PROVIDER_DISCONNECTED | First provider disconnected | Anthropic disconnected, OpenAI connected | Resolve orchestrator model | Returns `openai/gpt-5.4` |
| AGENTS-18-ALL_PROVIDERS_DISCONNECTED | All providers disconnected | No providers connected | Resolve any agent model | Returns `undefined`; OpenCode handles routing |
| AGENTS-19-FIRST_RUN_NULL_PROVIDER_CACHE | First-run (null provider cache) | No connected providers cache file | Resolve model | Returns `undefined`; skip model assignment |
| AGENTS-20-UNKNOWN_AGENT_FALLBACK_CHAIN | Unknown agent fallback chain | `getFallbackChain("nonexistent")` | Query | Returns empty array `[]` |
| AGENTS-21-OPENCODE_PROVIDER_UNIVERSAL_FALLBACK | `opencode` provider universal fallback | Only `opencode` provider connected | Resolve any agent | Matches (opencode in every chain entry) |
| AGENTS-22-CONFIG_FALLBACK_MODELS_OVERRIDE | Config fallback_models override | Agent config has `fallback_models: ["provider/custom-model"]` | Resolution | Uses custom chain instead of default |

### 1.5 Agent Builder

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AGENTS-23-AGENT_WITH_EMPTY_MODEL_STRING | Agent with empty model string | Config override `model: ""` | Build agent | Falls back to default or errors gracefully |
| AGENTS-24-AGENT_OVERRIDE_TEMPERATURE | Agent override temperature | Config `temperature: 1.5` | Build agent | Temperature applied |
| AGENTS-25-AGENT_OVERRIDE_PROMPT_APPEND | Agent override prompt_append | Config `prompt_append: "Extra rules"` | Build agent system prompt | Appended after base prompt |
| AGENTS-26-AGENT_DISABLE_VIA_CONFIG | Agent disable via config | Config `disable: true` | Agent registration | Agent excluded from registry |
| AGENTS-27-AGENTREGISTRY_DUPLICATE_REGISTER | AgentRegistry duplicate register | Same agent name registered twice | `register()` second time | Overwrites silently, logs warning |

---

## 2. Tools

### 2.1 grep

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-1-PATTERN_MATCH_FOUND | Pattern match found | File with matching content | `grep(pattern: "foo")` | Returns matching lines |
| TOOLS-2-NO_MATCHES | No matches | No files match pattern | `grep(pattern: "zzz_nonexistent")` | Returns `"No matches found"` |
| TOOLS-3-INVALID_REGEX | Invalid regex | Malformed regex pattern | `grep(pattern: "[invalid")` | Returns `"Error: ..."` string, not exception |
| TOOLS-4-INCLUDE_FILTER | Include filter | Multiple file types | `grep(pattern: "x", include: "*.ts")` | Only .ts files searched |
| TOOLS-5-OUTPUT_MODES | Output modes | File with matches | Mode `content` / `files_with_matches` / `count` | Each returns correct format |
| TOOLS-6-HEAD_LIMIT | Head limit | Many matches | `head_limit: 5` | At most 5 results returned |
| TOOLS-7-HEAD_LIMIT_ZERO | Head limit zero | Many matches | `head_limit: 0` | All results (unlimited) |
| TOOLS-8-NEGATIVE_HEAD_LIMIT | Negative head limit | `head_limit: -1` | Execute | Treated as unlimited (≤0 check) |
| TOOLS-9-BINARY_FILE_EXCLUSION | Binary file exclusion | Binary file with matching bytes | Search | Binary file excluded from results |
| TOOLS-10-EMPTY_PATTERN | Empty pattern | `pattern: ""` | Execute | Grep behavior (matches all lines) or error |

### 2.2 glob

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-11-PATTERN_MATCHES_FILES | Pattern matches files | Files exist | `glob(pattern: "*.ts")` | Returns absolute paths sorted by mtime desc |
| TOOLS-12-NO_FILES_FOUND | No files found | No matching files | `glob(pattern: "*.nonexistent")` | Returns `"No files found"` |
| TOOLS-13-100_FILE_HARD_CAP | 100 file hard cap | 150+ matching files | Execute | Returns exactly 100, most recent first |
| TOOLS-14-NO_TRUNCATION_WARNING | No truncation warning | Exactly 101 files | Execute | Result capped at 100, no warning appended |
| TOOLS-15-SINGLE_STAT_FAILURE | Single stat failure | One file deleted during scan | `stat()` rejects | Entire operation fails (Promise.all) |
| TOOLS-16-NESTED_GLOB | Nested glob | `pattern: "**/*.ts"` | Execute | Recurses directories |
| TOOLS-17-PATH_PARAMETER | Path parameter | `path: "/specific/dir"` | Execute | Only searches within that directory |

### 2.3 ast_grep_search

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-18-VALID_PATTERN_MATCH | Valid pattern match | TypeScript file with matching AST | `pattern: "console.log($MSG)", lang: "typescript"` | Returns matches with context |
| TOOLS-19-NO_MATCHES | No matches | No AST matches | Execute | Returns appropriate empty message |
| TOOLS-20-SG_BINARY_NOT_FOUND | `sg` binary not found | ast-grep not installed | Execute | Returns specific `"sg not found"` message |
| TOOLS-21-INVALID_LANGUAGE | Invalid language | `lang: "invalid"` | Execute | Zod validation rejects (enum) |
| TOOLS-22-EMPTY_PATHS_ARRAY | Empty paths array | `paths: []` | Execute | Defaults to `["."]` (falsy check) |
| TOOLS-23-CUSTOM_PATHS | Custom paths | `paths: ["src/tools"]` | Execute | Only searches in specified paths |
| TOOLS-24-CONTEXT_LINES | Context lines | `context: 3` | Execute | Shows 3 lines of context around matches |

### 2.4 ast_grep_replace

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-25-DRY_RUN_DEFAULT | Dry run (default) | `dryRun: undefined` | Execute | Prefixed with `"[DRY RUN]"`, no files changed |
| TOOLS-26-DRY_RUN_EXPLICIT_TRUE | Dry run explicit true | `dryRun: true` | Execute | Prefixed with `"[DRY RUN]"` |
| TOOLS-27-ACTUAL_REPLACE | Actual replace | `dryRun: false` (strict equality) | Execute | Files modified, no `"[DRY RUN]"` prefix |
| TOOLS-28-NO_MATCHES_TO_REPLACE | No matches to replace | Pattern doesn't match | Execute | Returns `"No matches found to replace"` |

### 2.5 hashline_edit (Most Complex Tool)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-29-REPLACE_LINE | replace_line | Valid LINE#HASH | Single line replaced | File updated correctly |
| TOOLS-30-REPLACE_RANGE | replace_range | Valid start and end hashes | Range replaced | Lines between pos..end inclusive replaced |
| TOOLS-31-APPEND_AT | append_at | Valid anchor line | Insert after | New lines appear after anchor |
| TOOLS-32-PREPEND_AT | prepend_at | Valid anchor line | Insert before | New lines appear before anchor |
| TOOLS-33-APPEND_FILE | append_file | Any file | Append to end | Lines added at EOF |
| TOOLS-34-PREPEND_FILE | prepend_file | Any file | Prepend to start | Lines added at beginning |
| TOOLS-35-HASH_MISMATCH | Hash mismatch | Wrong hash for line | Edit attempted | Error with corrective remap suggestions |
| TOOLS-36-OVERLAPPING_RANGES | Overlapping ranges | Two replace_range ops overlap | Validation | Error: overlapping ranges detected |
| TOOLS-37-INSERT_INSIDE_REPLACED_RANGE | Insert inside replaced range | append_at targeting line in a replace_range | Validation | Error: insert inside replaced range |
| TOOLS-38-EMPTY_EDITS_ARRAY | Empty edits array | `edits: []` | Execute | Error: empty edits |
| TOOLS-39-FILE_NOT_FOUND_CREATE_MODE | File not found (create mode) | Non-existent file, ALL ops are append/prepend_file | Execute | File created |
| TOOLS-40-FILE_NOT_FOUND_EDIT_MODE | File not found (edit mode) | Non-existent file, has replace_line op | Execute | Error: file not found |
| TOOLS-41-DELETION_VIA_NULL_LINES | Deletion via null lines | `lines: null` with replace_range | Execute | Lines deleted |
| TOOLS-42-STRING_LINES_SPLIT | String lines split | `lines: "line1\nline2"` | Execute | Split by `\n`, treated as array |
| TOOLS-43-DUPLICATE_EDITS | Duplicate edits | Two identical operations | Execute | Silently deduplicated |
| TOOLS-44-ALL_NOOP_EDITS | All-noop edits | Replacement content same as existing | Execute | Error: all edits are no-ops |
| TOOLS-45-LINE_0_REJECTED | Line 0 rejected | `pos: "0#XJ"` | Validation | Error: line 0 invalid |
| TOOLS-46-TOLERANT_PARSER_STRIPS_PREFIXES | Tolerant parser strips prefixes | `pos: ">42#VK"` or `"+42#VK"` | Parsing | Strips `>`, `+`, `-` prefixes, uses 42#VK |
| TOOLS-47-BOTTOM_UP_SORT | Bottom-up sort | Multiple edits at different lines | Application | Applied bottom-up to preserve line numbers |
| TOOLS-48-HASH_ALPHABET | Hash alphabet | Hash characters | Validation | Only `ZPMQVRWSNKTXJBYH` characters accepted |

### 2.6 LSP Tools (6 tools)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-49-GOTO_DEFINITION_FOUND | goto_definition found | Symbol with definition | Execute | Returns file location |
| TOOLS-50-GOTO_DEFINITION_NOT_FOUND | goto_definition not found | No definition | Execute | Returns `"No definition found"` |
| TOOLS-51-FIND_REFERENCES_FOUND | find_references found | Symbol with references | Execute | Returns all reference locations |
| TOOLS-52-FIND_REFERENCES_EMPTY_ARRAY | find_references empty array | Symbol exists but no refs | Execute | Returns `"No references found"` |
| TOOLS-53-SYMBOLS_DOCUMENT_SCOPE | symbols document scope | File with symbols | `scope: "document"` | Returns document symbols |
| TOOLS-54-SYMBOLS_WORKSPACE_SCOPE | symbols workspace scope | Workspace query | `scope: "workspace", query: "foo"` | Returns workspace-wide symbols |
| TOOLS-55-SYMBOLS_WORKSPACE_WITHOUT_QUERY | symbols workspace without query | `scope: "workspace"` with no query | Execute | Hand-coded validation rejects |
| TOOLS-56-DIAGNOSTICS_WITH_SEVERITY_FILTER | diagnostics with severity filter | File with mixed diagnostics | `severity: "error"` | Only errors returned |
| TOOLS-57-DIAGNOSTICS_WITH_EXTENSION | diagnostics with extension | Directory | `extension: ".ts"` | Searches .ts files in directory |
| TOOLS-58-PREPARE_RENAME_VALID | prepare_rename valid | Renameable symbol | Execute | Returns rename range |
| TOOLS-59-PREPARE_RENAME_INVALID | prepare_rename invalid | Non-renameable position | Execute | Returns `"Rename is not valid at this position"` |
| TOOLS-60-RENAME_WITH_EMPTY_NEWNAME | rename with empty newName | `newName: ""` | Execute | Zod validation rejects — `.min(1)` enforced *(fixed)* |
| TOOLS-61-LSP_CLIENT_UNAVAILABLE | LSP client unavailable | No LSP server | Any LSP tool | Returns `"LSP client method unavailable"` |
| TOOLS-62-FLOAT_LINE_NUMBERS | Float line numbers | `line: 1.5` | Execute | Zod validation rejects — `.int()` enforced on all LSP position args *(fixed)* |
| TOOLS-63-DISPATCH_STRATEGY_FALLBACK | Dispatch strategy fallback | Primary method unavailable | Execute | Falls through 5-strategy chain |
| TOOLS-64-PREPARE_RENAME_RETURNS | Prepare_rename returns [] | Empty array result | Execute | Returns `"Rename is not valid at this position"` — empty array handled same as null *(fixed)* |
| TOOLS-65-UNWRAPCLIENTRESPONSE_WITH_ERROR_0 | `unwrapClientResponse` with `error: 0` | Response has falsy error | Execute | Does not throw — truthy check `if (record.error)` used *(fixed)* |

### 2.7 delegate_task

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-66-BACKGROUND_TASK_LAUNCH | Background task launch | `run_in_background: true` | Execute | Returns task_id, status=running |
| TOOLS-67-SYNC_TASK_EXECUTION | Sync task execution | `run_in_background: false` | Execute | Returns task result inline |
| TOOLS-68-UNKNOWN_CATEGORY | Unknown category | `category: "nonexistent"` | Execute | Returns error with available categories list |
| TOOLS-69-SESSION_RESUME_SYNC | Session resume (sync) | `session_id: "ses_xxx"` | Execute sync | Resumes existing session |
| TOOLS-70-SESSION_RESUME_BACKGROUND | Session resume (background) | `session_id: "ses_xxx", run_in_background: true` | Execute | Returns error: session_id not supported for background |
| TOOLS-71-DEPTH_AT_LIMIT | Depth at limit | Agent at depth=2 | Delegates | Returns `"Delegation blocked: maximum depth (2) reached"` |
| TOOLS-72-DEPTH_UNKNOWN_API_ERROR | Depth unknown (API error) | `extractDelegationDepth` throws | Delegates | Returns `"Delegation blocked: unable to determine depth"` |
| TOOLS-73-DEPTH_0_ROOT | Depth 0 (root) | Orchestrator session | Delegates | Allowed; injects `depth=1` marker |
| TOOLS-74-DEPTH_1_SPECIALIST | Depth 1 (specialist) | Depth-1 agent | Delegates | Allowed; injects `depth=2` marker |
| TOOLS-75-NO_DEPTH_MARKER_FOUND | No depth marker found | Session with no marker | `extractDelegationDepth()` | Returns 0 (assumes root) |
| TOOLS-76-CLIENT_UNAVAILABLE | Client unavailable | Neither tool context nor stored context has client | Execute | Throws Error |
| TOOLS-77-METADATA_EMISSION_TIMING | Metadata emission timing | Background task launched | First metadata before session, second after | Both emitted; second has sessionId |
| TOOLS-78-WAITFORSESSIONID_TIMEOUT | waitForSessionId timeout | Session creation delayed >5s | `waitForSessionId()` | Returns undefined after 5s |
| TOOLS-79-SYNC_POLL_TIMEOUT | Sync poll timeout | Task takes >55s | `pollForResult()` | Returns timeout message with session ID |
| TOOLS-80-SYNC_STABILITY_DETECTION | Sync stability detection | Message count stable for 3 polls | Poll loop | Returns last assistant message |
| TOOLS-81-CATEGORY_WITH_PROMPT_APPEND | Category with prompt_append | Category has prompt_append | Build prompt | Appended to user prompt |
| TOOLS-82-EMPTY_SUBAGENT_TYPE | Empty subagent_type | `subagent_type: ""` | `deriveSubagent()` | Falls back to category name |

### 2.8 background_output

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-83-TASK_COMPLETED | Task completed | Task in completed state | `background_output(task_id)` | Returns result |
| TOOLS-84-TASK_RUNNING_NO_BLOCK | Task running, no block | Task in running state, `block: false` | Execute | Returns status immediately |
| TOOLS-85-TASK_RUNNING_BLOCK_UNTIL_COMPLETE | Task running, block until complete | Task completes within timeout | `block: true, timeout: 30000` | Returns result after completion |
| TOOLS-86-TASK_RUNNING_BLOCK_TIMEOUT | Task running, block timeout | Task doesn't complete | `block: true, timeout: 5000` | Returns current status after timeout |
| TOOLS-87-TASK_NOT_FOUND | Task not found | Invalid task_id | Execute | Returns error message |
| TOOLS-88-TASK_CANCELLED | Task cancelled | Task in cancelled state | Execute | Returns `"Task was cancelled"` |
| TOOLS-89-TASK_FAILED | Task failed | Task in failed state | Execute | Returns error details |
| TOOLS-90-FULL_SESSION_MODE | full_session mode | Completed task with session | `full_session: true` | Returns formatted session messages |
| TOOLS-91-MESSAGE_LIMIT_CAP | message_limit cap | `message_limit: 150` | Execute | Capped at 100 |
| TOOLS-92-SINCE_MESSAGE_ID | since_message_id | Valid message ID | Execute | Returns messages after that ID |
| TOOLS-93-SINCE_MESSAGE_ID_NOT_FOUND | since_message_id not found | Invalid message ID | Execute | Returns all messages (filter returns -1) |
| TOOLS-94-THINKING_MAX_CHARS | thinking_max_chars | Long thinking block | `thinking_max_chars: 100` | Thinking truncated to 100 chars |
| TOOLS-95-EMPTY_TASK_RESULT_FALLBACK | Empty task result fallback | Task completed but result empty | Execute | Falls back to session last-assistant-message |

### 2.9 background_cancel

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-96-CANCEL_SPECIFIC_TASK | Cancel specific task | Running task | `task_id: "task_xxx"` | Task cancelled, returns success |
| TOOLS-97-CANCEL_ALL | Cancel all | Multiple running tasks | `all: true` | All running/queued tasks cancelled |
| TOOLS-98-CANCEL_ALREADY_COMPLETED | Cancel already completed | Task in completed state | `task_id: "task_xxx"` | Returns error: cannot cancel terminal state |
| TOOLS-99-CANCEL_NON_EXISTENT | Cancel non-existent | Invalid task_id | Execute | Returns error: task not found |
| TOOLS-100-NO_ARGS | No args | Neither task_id nor all | Execute | Returns error: invalid arguments |
| TOOLS-101-ALL_WITH_NO_RUNNING_TASKS | All with no running tasks | No running/queued tasks | `all: true` | Returns "No running or queued tasks" |
| TOOLS-102-CANCEL_ALL_ONLY_CANCELS_OWN_CHILDREN_PROPOSED_FI | Cancel all only cancels own children (PROPOSED FIX) | Depth-1 agent calls `all=true` | Execute | Only cancels tasks with matching parentSessionID |

### 2.10 Session Manager Tools (4 tools)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-103-SESSION_LIST_DEFAULT | session_list default | Sessions exist | `session_list()` | Returns up to 20 sessions sorted by updated desc |
| TOOLS-104-SESSION_LIST_WITH_LIMIT | session_list with limit | `limit: 5` | Execute | Returns at most 5 sessions |
| TOOLS-105-SESSION_LIST_DATE_FILTER | session_list date filter | `from_date: "2026-01-01"` | Execute | Only sessions after that date |
| TOOLS-106-SESSION_LIST_INVALID_DATE | session_list invalid date | `from_date: "not-a-date"` | Execute | Returns all sessions — `Number.isNaN` guard keeps sessions when date is unparseable *(fixed)* |
| TOOLS-107-SESSION_LIST_FILTERS_CHILD_SESSIONS | session_list filters child sessions | Parent + child sessions exist | Execute | Child sessions (with parentID) excluded |
| TOOLS-108-SESSION_READ_BASIC | session_read basic | Valid session with messages | `session_read(session_id)` | Returns formatted messages |
| TOOLS-109-SESSION_READ_WITH_LIMIT | session_read with limit | `limit: 3` | Execute | Returns first 3 messages (not last 3) |
| TOOLS-110-SESSION_READ_LIMIT_0 | session_read limit=0 | `limit: 0` | Execute | Returns all messages |
| TOOLS-111-SESSION_READ_INCLUDE_TODOS | session_read include_todos | `include_todos: true` | Execute | Todos appended to output |
| TOOLS-112-SESSION_READ_INCLUDE_TRANSCRIPT | session_read include_transcript | `include_transcript: true` | Execute | Parameter removed from schema entirely *(fixed)* |
| TOOLS-113-SESSION_READ_THINKING_TRUNCATION | session_read thinking truncation | Message with long thinking | Execute | Truncated to 200 chars |
| TOOLS-114-SESSION_READ_TOOL_INPUT_TRUNCATION | session_read tool input truncation | Message with long tool JSON | Execute | Truncated to 100 chars |
| TOOLS-115-SESSION_SEARCH_FOUND | session_search found | Query matches messages | Execute | Returns excerpts with context |
| TOOLS-116-SESSION_SEARCH_NO_MATCHES | session_search no matches | Query matches nothing | Execute | Returns "No matches found" |
| TOOLS-117-SESSION_SEARCH_EMPTY_QUERY | session_search empty query | `query: " "` | Execute | Returns "No matches found" (not error) |
| TOOLS-118-SESSION_SEARCH_TIMEOUT | session_search timeout | 50+ sessions, slow scan | Execute | Times out after 60s |
| TOOLS-119-SESSION_SEARCH_CASE_SENSITIVE | session_search case sensitive | `case_sensitive: true` | Execute | Exact case matching |
| TOOLS-120-SESSION_INFO_BASIC | session_info basic | Valid session | Execute | Returns metadata (messages, dates, agents, todos) |
| TOOLS-121-SESSION_INFO_HASTRANSCRIPT | session_info hasTranscript | Any session | Execute | `hasTranscript` field removed from output *(fixed)* |

### 2.11 Task Management Tools (4 tools)

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-122-TASK_CREATE_BASIC | task_create basic | Valid subject | Execute | Returns created task with UUID |
| TOOLS-123-TASK_CREATE_EMPTY_SUBJECT | task_create empty subject | `subject: ""` | Execute | Succeeds (no validation on content) |
| TOOLS-124-TASK_CREATE_DEFAULTS | task_create defaults | No priority/status | Execute | Defaults: priority=medium, status=pending |
| TOOLS-125-TASK_GET_FOUND | task_get found | Existing task ID | Execute | Returns full task details |
| TOOLS-126-TASK_GET_NOT_FOUND | task_get not found | Invalid ID | Execute | Returns "Task not found" |
| TOOLS-127-TASK_GET_EMPTY_STRING | task_get empty string | `id: ""` | Execute | Returns "Task not found" |
| TOOLS-128-TASK_LIST_ALL | task_list all | Tasks exist | `task_list()` | Returns all tasks in compact format |
| TOOLS-129-TASK_LIST_FILTER_STATUS | task_list filter status | `status: "completed"` | Execute | Only completed tasks |
| TOOLS-130-TASK_LIST_FILTER_PRIORITY | task_list filter priority | `priority: "high"` | Execute | Only high priority tasks |
| TOOLS-131-TASK_LIST_DUAL_FILTER | task_list dual filter | `status: "pending", priority: "high"` | Execute | AND logic: pending AND high |
| TOOLS-132-TASK_LIST_NO_RESULTS | task_list no results | No matching tasks | Execute | Returns empty list message |
| TOOLS-133-TASK_UPDATE_BASIC | task_update basic | Existing task, `status: "completed"` | Execute | Status updated, updatedAt set |
| TOOLS-134-TASK_UPDATE_NO_OP | task_update no-op | Existing task, no optional fields | Execute | Still bumps `updatedAt` |
| TOOLS-135-TASK_UPDATE_NOT_FOUND | task_update not found | Invalid ID | Execute | Returns error |
| TOOLS-136-TASK_UPDATE_BACKWARD_TRANSITION | task_update backward transition | `completed → pending` | Execute | Allowed (no transition validation) |
| TOOLS-137-TASK_UPDATE_CAN_T_CLEAR_CONTENT | task_update can't clear content | Task with content, `content: undefined` | Execute | Content remains (can't clear to undefined) |
| TOOLS-138-TASK_STORE_VOLATILITY | task store volatility | Tasks created, process restarts | Execute | All tasks lost (in-memory only) |

### 2.12 skill

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-139-LOAD_EXISTING_SKILL | Load existing skill | `git-gud` skill registered | `skill(name: "git-gud")` | Returns skill content |
| TOOLS-140-SKILL_NOT_FOUND | Skill not found | Unknown skill name | Execute | Returns error message |
| TOOLS-141-NO_LOADER_REGISTERED | No loader registered | `registeredLoader` is null | Execute | Returns error |
| TOOLS-142-EMPTY_STRING_FROM_LOADER | Empty string from loader | Loader returns `""` | Execute | Treated as valid (truthy check: `content !== undefined`) |
| TOOLS-143-LOADER_THROWS | Loader throws | Loader function throws Error | Execute | Returns `"Error loading skill '\{name\}': \{message\}"` — loader wrapped in try/catch *(fixed)* |

### 2.13 look_at

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| TOOLS-144-IMAGE_FILE | Image file | Valid PNG path | Execute | Sends to advisor session with binary encoding |
| TOOLS-145-PDF_FILE | PDF file | Valid PDF path | Execute | Sends with `application/pdf` mime |
| TOOLS-146-TEXT_FILE | Text file | Valid .ts file | Execute | Content embedded in prompt (no truncation) |
| TOOLS-147-SVG_FILE | SVG file | .svg file | Execute | Treated as binary (extension-based) |
| TOOLS-148-BOTH_INPUTS_PROVIDED | Both inputs provided | `file_path` AND `image_data` | Execute | Returns error: exactly one required |
| TOOLS-149-NEITHER_INPUT | Neither input | No file_path, no image_data | Execute | Returns error |
| TOOLS-150-RAW_BASE64_WITHOUT_DATA_URI | Raw base64 without data URI | Base64 string (no `data:` prefix) | Execute | Defaults to `image/png` |
| TOOLS-151-LARGE_FILE | Large file | Multi-MB text file | Execute | Returns error for files >1 MB — `file.size` checked before `file.text()` *(fixed)* |

---

## 3. Hooks

### 3.1 Context Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-1-AGENTS_INJECTOR_FIRST_READ | agents-injector first read | Read tool, AGENTS.md exists in directory | After read | Full AGENTS.md content appended |
| HOOKS-2-AGENTS_INJECTOR_SUBSEQUENT_READ_SAME_DIR | agents-injector subsequent read (same dir) | Same directory read again | After read | Short back-reference appended (not full content) |
| HOOKS-3-AGENTS_INJECTOR_NO_AGENTS_MD | agents-injector no AGENTS.md | Read tool, no AGENTS.md in tree | After read | Nothing appended |
| HOOKS-4-AGENTS_INJECTOR_UNDEFINED_TITLE | agents-injector undefined title | Read output with no title | After read | Early return (no append) |
| HOOKS-5-AGENTS_INJECTOR_NO_SESSIONID | agents-injector no sessionID | Tool context missing sessionID | After read | Uses `"__default"` key for dedup tracking |
| HOOKS-6-README_INJECTOR | readme-injector | Read tool, README.md exists | After read | README content appended |
| HOOKS-7-README_INJECTOR_REPEATED | readme-injector repeated | Same directory read twice | After read | README injected BOTH times (no dedup) |
| HOOKS-8-RULES_INJECTOR | rules-injector | `.rules` and/or `RULES.md` exist | System transform | Content appended to system output |
| HOOKS-9-RULES_INJECTOR_NO_FILES | rules-injector no files | Neither file exists | System transform | Early return |
| HOOKS-10-COMPACTION_CONTEXT_SNAPSHOT | compaction-context snapshot | `session.compacted` event | System transform follows | Snapshot injected then deleted (one-shot) |
| HOOKS-11-COMPACTION_CONTEXT_TRUNCATION | compaction-context truncation | `.sisyphus/todos.md` > 4000 chars | Event | Truncated to 4000 chars |
| HOOKS-12-COMPACTION_CONTEXT_NO_TODOS_OR_PLANS | compaction-context no todos or plans | No `.sisyphus/` files | Event | Null snapshot, nothing stored |
| HOOKS-13-PHASE_REMINDER_ORCHESTRATOR | phase-reminder orchestrator | Last user message for orchestrator | Messages transform | Reminder prepended to message text |
| HOOKS-14-PHASE_REMINDER_NON_ORCHESTRATOR | phase-reminder non-orchestrator | Last user message for explorer | Messages transform | No reminder added |
| HOOKS-15-PHASE_REMINDER_IDEMPOTENT | phase-reminder idempotent | Message already has reminder | Messages transform | No duplicate reminder |
| HOOKS-16-SKILL_DISCOVERY_WITH_SKILLS | skill-discovery with skills | Skills available | System transform | Skills list appended to system |
| HOOKS-17-SKILL_DISCOVERY_NO_SKILLS | skill-discovery no skills | No skills loaded | System transform | Early return |

### 3.2 Recovery Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-18-EDIT_ERROR_OLDSTRING_NOT_FOUND | edit-error: oldString not found | Edit tool returns "oldString not found" | After edit | Recovery message appended |
| HOOKS-19-EDIT_ERROR_MULTIPLE_MATCHES | edit-error: multiple matches | Edit returns "found multiple times" | After edit | Recovery message appended |
| HOOKS-20-EDIT_ERROR_SAME_OLD_AND_NEW | edit-error: same old and new | Edit returns "must be different" | After edit | Recovery message appended |
| HOOKS-21-EDIT_ERROR_NON_EDIT_TOOL | edit-error: non-edit tool | Grep tool with similar output | After tool | No recovery (wrong tool) |
| HOOKS-22-EDIT_ERROR_IDEMPOTENT | edit-error: idempotent | Output already has recovery marker | After edit | No duplicate |
| HOOKS-23-JSON_ERROR_JSON_PARSE_ERROR | json-error: JSON parse error | Output has "unexpected token" | After tool | JSON recovery appended |
| HOOKS-24-JSON_ERROR_EXPECTED_JSON_CONTENT | json-error: expected JSON content | Title says "json", content starts with `{` but invalid | After tool | Recovery appended |
| HOOKS-25-JSON_ERROR_VALID_JSON | json-error: valid JSON | Title says "json", content is valid JSON | After tool | No recovery |
| HOOKS-26-SESSION_RECOVERY_CRASH_PATTERN | session-recovery: crash pattern | Error matches "session.*crash" | Event | Recovery context set |
| HOOKS-27-SESSION_RECOVERY_NON_MATCHING_ERROR | session-recovery: non-matching error | Error is "rate limit exceeded" | Event | No recovery (different hook handles this) |
| HOOKS-28-SESSION_RECOVERY_EXISTING_CONTEXT | session-recovery: existing context | Event already has recoveryContext | Event | Appends to existing context |
| HOOKS-29-CONTEXT_WINDOW_LIMIT_90_USAGE | context-window-limit: 90% usage | `contextWindowUsage: 0.9` on idle | Event | Recovery actions: compact, summarize |
| HOOKS-30-CONTEXT_WINDOW_LIMIT_PERCENTAGE_FORMAT | context-window-limit: percentage format | `contextWindowUsage: 95` (>1) | Event | Divided by 100 → treated as 0.95 |
| HOOKS-31-CONTEXT_WINDOW_LIMIT_TOKEN_LIMIT_ERROR | context-window-limit: token limit error | Error "maximum context length exceeded" | Error event | Recovery context set |
| HOOKS-32-ERROR_DIAGNOSTICS_RATE_LIMIT | error-diagnostics: rate limit | Output "429 Too Many Requests" | After tool | Diagnostic block appended |
| HOOKS-33-ERROR_DIAGNOSTICS_LONG_OUTPUT | error-diagnostics: long output | Output > 1500 chars | After tool | SKIPPED (avoids false positives) |
| HOOKS-34-ERROR_DIAGNOSTICS_EVENT_ERROR | error-diagnostics: event error | `session.error` with "permission denied" | Event | `recoveryContext` set |
| HOOKS-35-ERROR_DIAGNOSTICS_PATTERN_PRIORITY | error-diagnostics: pattern priority | Output matches both rate-limit and auth | After tool | First match wins (rate-limit) |

### 3.3 Model Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-36-MODEL_FALLBACK_RATE_LIMIT | model-fallback: rate limit | 429 error on session | Event | Switches to next model in chain |
| HOOKS-37-MODEL_FALLBACK_SERVICE_UNAVAILABLE | model-fallback: service unavailable | 503 error | Event | Switches to next model |
| HOOKS-38-MODEL_FALLBACK_NO_SESSIONID | model-fallback: no sessionID | Error event without sessionID | Event | Early return (no fallback) |
| HOOKS-39-MODEL_FALLBACK_NO_ELIGIBLE_MODEL | model-fallback: no eligible model | All fallback models unavailable | Event | Returns without switching |
| HOOKS-40-MODEL_FALLBACK_NEXT_SAME_AS_CURRENT | model-fallback: next same as current | Only one model in chain | Event | No-op (no switch) |
| HOOKS-41-RUNTIME_FALLBACK_MODEL_NOT_FOUND | runtime-fallback: model not found | "model not found" error | Event | Switches to available model |
| HOOKS-42-RUNTIME_FALLBACK_CONTEXT_EXCEEDED | runtime-fallback: context exceeded | "context length exceeded" | Event | Switches to model with larger context |
| HOOKS-43-RUNTIME_FALLBACK_SAME_PROVIDER_FIRST | runtime-fallback: same provider first | Current model is anthropic | Event | Tries anthropic models first, then cross-provider |
| HOOKS-44-PREEMPTIVE_COMPACTION_THRESHOLD_REACHED | preemptive-compaction: threshold reached | Token usage ≥ 80% | Event | `compactSession` called |
| HOOKS-45-PREEMPTIVE_COMPACTION_ALREADY_COMPACTED | preemptive-compaction: already compacted | Same session above threshold again | Event | No re-compaction (Set tracks) |
| HOOKS-46-PREEMPTIVE_COMPACTION_DROPS_BELOW_THRESHOLD | preemptive-compaction: drops below threshold | Usage drops, then rises again | Event | Cleared from Set, re-compaction allowed |
| HOOKS-47-PREEMPTIVE_COMPACTION_COMPACTION_FAILURE | preemptive-compaction: compaction failure | `compactSession` throws | Event | Removed from Set (allows retry) |
| HOOKS-48-PREEMPTIVE_COMPACTION_NO_CONTEXTLIMIT | preemptive-compaction: no contextLimit | `contextLimit: 0` or missing | Event | Early return |

### 3.4 Quality Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-49-COMMENT_CHECKER_EMPTY_CATCH_BLOCK | comment-checker: empty catch block | Write tool with `catch (e) {}` | Before tool | Warning appended |
| HOOKS-50-COMMENT_CHECKER_CATCH_WITH_BODY | comment-checker: catch with body | `catch (e) { log(e) }` | Before tool | No warning |
| HOOKS-51-COMMENT_CHECKER_NON_WRITE_TOOL | comment-checker: non-write tool | Read tool with empty catch | Before tool | No warning (wrong tool) |
| HOOKS-52-WRITE_FILE_GUARD_READ_THEN_WRITE | write-file-guard: read then write | Read file, then write same file | Pre-tool-use | Write allowed |
| HOOKS-53-WRITE_FILE_GUARD_WRITE_WITHOUT_READ | write-file-guard: write without read | Write to existing file, no prior read | Pre-tool-use | **Throws Error** blocking write |
| HOOKS-54-WRITE_FILE_GUARD_NEW_FILE | write-file-guard: new file | Write to non-existent file | Pre-tool-use | Write allowed (new file always OK) |
| HOOKS-55-WRITE_FILE_GUARD_SISYPHUS_PATH | write-file-guard: .sisyphus/ path | Write to `.sisyphus/` file | Pre-tool-use | Always allowed (exempt path) |
| HOOKS-56-WRITE_FILE_GUARD_READ_CONSUMED | write-file-guard: read consumed | Read file A, write file A, write file A again | Second write | **Throws Error** (read consumed on first write) |
| HOOKS-57-WRITE_FILE_GUARD_SESSION_CLEANUP | write-file-guard: session cleanup | `session.deleted` event | Event | Session tracking state cleaned |
| HOOKS-58-WRITE_FILE_GUARD_256_SESSION_LIMIT | write-file-guard: 256 session limit | 257th session | Track | Oldest session evicted |
| HOOKS-59-WRITE_FILE_GUARD_1024_PATH_LIMIT | write-file-guard: 1024 path limit | 1025th path in session | Track | Oldest path evicted (Set iteration order) |
| HOOKS-60-THINKING_BLOCK_VALIDATOR_MALFORMED_THINKING | thinking-block-validator: malformed thinking | Assistant message with empty thinking part | Messages transform | Empty thinking part removed |
| HOOKS-61-THINKING_BLOCK_VALIDATOR_VALID_THINKING | thinking-block-validator: valid thinking | Assistant message with content in thinking | Messages transform | Kept as-is |
| HOOKS-62-TOOL_PAIRING_VALIDATOR_ORPHANED_TOOL_USE | tool-pairing-validator: orphaned tool_use | Tool_use without matching tool_result | Messages transform | Orphaned part removed |
| HOOKS-63-TOOL_PAIRING_VALIDATOR_ORPHANED_TOOL_RESULT | tool-pairing-validator: orphaned tool_result | Tool_result referencing non-existent tool_use ID | Messages transform | Orphaned part removed |
| HOOKS-64-TOOL_PAIRING_VALIDATOR_PAIRED_CORRECTLY | tool-pairing-validator: paired correctly | Matching tool_use + tool_result | Messages transform | Both kept |

### 3.5 Productivity Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-65-KEYWORD_DETECTOR_ULTRAWORK | keyword-detector: ultrawork | User says "ultrawork" | Chat message | Session mode set to "ultrawork" |
| HOOKS-66-KEYWORD_DETECTOR_ULW_SHORTHAND | keyword-detector: ulw shorthand | User says "ulw do this" | Chat message | Session mode set to "ultrawork" |
| HOOKS-67-KEYWORD_DETECTOR_IN_CODE_BLOCK | keyword-detector: in code block | User says `` `ultrawork` `` in backticks | Chat message | NOT detected (code blocks stripped) |
| HOOKS-68-KEYWORD_DETECTOR_DEEP_THINK | keyword-detector: deep-think | User says "deep-think" | Chat message | Session mode set to "think" |
| HOOKS-69-KEYWORD_DETECTOR_FAST | keyword-detector: fast | User says "fast fix this" | Chat message | Session mode set to "fast" |
| HOOKS-70-KEYWORD_DETECTOR_PRIORITY | keyword-detector: priority | Message has both "ultrawork" and "fast" | Chat message | "ultrawork" wins (first match) |
| HOOKS-71-THINK_MODE_CLAUDE_MODEL | think-mode: Claude model | Mode=think, Anthropic model | Chat params | `options.thinking` set with 10000 budget |
| HOOKS-72-THINK_MODE_NON_CLAUDE | think-mode: non-Claude | Mode=think, OpenAI model | Chat params | No thinking injection |
| HOOKS-73-THINK_MODE_ALREADY_SET | think-mode: already set | `options.thinking` already defined | Chat params | Skipped (no override) |
| HOOKS-74-ANTHROPIC_EFFORT_MEDIUM | anthropic-effort: medium | Claude, effort=medium | Chat params | Thinking budget=5000 |
| HOOKS-75-ANTHROPIC_EFFORT_MAX_ON_OPUS | anthropic-effort: max on Opus | Claude Opus, effort=max | Chat params | Budget=32000 + `options.effort = "max"` |
| HOOKS-76-ANTHROPIC_EFFORT_LOW | anthropic-effort: low | effort=low | Chat params | No-op |
| HOOKS-77-ULTRAWORK_MODE_CLAUDE | ultrawork-mode: Claude | Mode=ultrawork, Claude | Chat params | Thinking injected + system context with `<ultrawork-mode>` |
| HOOKS-78-ULTRAWORK_MODE_NON_CLAUDE | ultrawork-mode: non-Claude | Mode=ultrawork, GPT | Chat params | Only system context (no thinking) |
| HOOKS-79-ULTRAWORK_MODE_IDEMPOTENT | ultrawork-mode: idempotent | System already has `<ultrawork-mode>` | Chat params | No duplicate injection |

### 3.6 Output Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-80-TOOL_OUTPUT_TRUNCATOR_LARGE_OUTPUT | tool-output-truncator: large output | Grep returns >51200 bytes | After tool | Written to temp file, truncated in-place |
| HOOKS-81-TOOL_OUTPUT_TRUNCATOR_2000_LINES | tool-output-truncator: >2000 lines | Glob returns 2500 lines | After tool | Truncated to 2000 lines + notice |
| HOOKS-82-TOOL_OUTPUT_TRUNCATOR_NON_TRUNCATABLE_TOOL | tool-output-truncator: non-truncatable tool | Read tool with large output | After tool | Not truncated (read not in truncatable set) |
| HOOKS-83-TOOL_OUTPUT_TRUNCATOR_CASE_SENSITIVITY | tool-output-truncator: case sensitivity | Tool named "Bash" vs "bash" | After tool | Both are in the set (both listed) |
| HOOKS-84-HASHLINE_READ_ENHANCER_READ_TOOL | hashline-read-enhancer: read tool | Standard read output `1: content` | After read | Transformed to `1#HASH\|content` |
| HOOKS-85-HASHLINE_READ_ENHANCER_WRITE_TOOL | hashline-read-enhancer: write tool | Write completes | After write | Replaced with concise `"File written. N lines."` |
| HOOKS-86-HASHLINE_READ_ENHANCER_WRITE_ERROR | hashline-read-enhancer: write error | Write output starts with "error" | After write | Kept unchanged |
| HOOKS-87-HASHLINE_READ_ENHANCER_TRUNCATED_LINE | hashline-read-enhancer: truncated line | Line ending with "... (line truncated)" | After read | No hash added for truncated lines |
| HOOKS-88-HASHLINE_READ_ENHANCER_NON_TEXT_FILE | hashline-read-enhancer: non-text file | Binary content (first line doesn't match) | After read | Returned unchanged |
| HOOKS-89-HASHLINE_DIFF_ENHANCER_BEFORE_CAPTURE | hashline-diff-enhancer: before capture | Write tool invoked | Before write | Old file content captured and stored |
| HOOKS-90-HASHLINE_DIFF_ENHANCER_STALE_CLEANUP | hashline-diff-enhancer: stale cleanup | Captures older than 5 minutes | Next before call | Stale entries cleaned |
| HOOKS-91-HASHLINE_DIFF_ENHANCER_NO_BEFORE_CAPTURE | hashline-diff-enhancer: no before capture | After write without matching before | After write | Returns without diff metadata |

### 3.7 Continuation Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-92-TODO_ENFORCER_PENDING_TODOS | todo-enforcer: pending todos | Session idle, pending todos exist | Event | Continuation message injected |
| HOOKS-93-TODO_ENFORCER_ALL_COMPLETE | todo-enforcer: all complete | Session idle, all todos completed | Event | No injection (idle legitimate) |
| HOOKS-94-TODO_ENFORCER_NO_SESSIONID | todo-enforcer: no sessionID | Idle event without sessionID | Event | Early return |
| HOOKS-95-COMPACTION_TODO_PRESERVER_WITH_TODOS | compaction-todo-preserver: with todos | Session compacting, todos exist | Event | Full todo snapshot prepended to context |
| HOOKS-96-COMPACTION_TODO_PRESERVER_ALL_STATUSES | compaction-todo-preserver: all statuses | Completed + cancelled + pending todos | Event | ALL statuses included in snapshot |
| HOOKS-97-STOP_GUARD_STOP_WITH_PENDING_TODOS | stop-guard: stop with pending todos | User says "I'm done", pending todos exist | Chat message | Stop guard message injected |
| HOOKS-98-STOP_GUARD_STOP_WITH_COMPLETE_TODOS | stop-guard: stop with complete todos | User says "task complete", all done | Chat message | No injection (stop allowed) |
| HOOKS-99-STOP_GUARD_NO_STOP_PATTERN | stop-guard: no stop pattern | User says "continue" | Chat message | No injection |
| HOOKS-100-FOREGROUND_FALLBACK_RATE_LIMIT | foreground-fallback: rate limit | Session error with 429 | Event | Retry with fallback model |
| HOOKS-101-FOREGROUND_FALLBACK_DEDUP_WINDOW | foreground-fallback: dedup window | Same session+model within 5s | Event | Second trigger ignored |
| HOOKS-102-FOREGROUND_FALLBACK_CONCURRENT_LOCK | foreground-fallback: concurrent lock | Same session being processed | Event | Ignored (inProgress Set) |
| HOOKS-103-FOREGROUND_FALLBACK_NO_FALLBACK_AVAILABLE | foreground-fallback: no fallback available | All models exhausted | Event | Logs and returns |
| HOOKS-104-FOREGROUND_FALLBACK_CLEANUP | foreground-fallback: cleanup | >100 entries in lastTrigger map | Event | Entries >5min cleaned |

### 3.8 Task Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-105-DELEGATE_RETRY_MISSING_RUN_IN_BACKGROUND | delegate-retry: missing run_in_background | Task error "[ERROR] Invalid arguments" | After tool | Retry guidance with fix hint |
| HOOKS-106-DELEGATE_RETRY_UNKNOWN_CATEGORY | delegate-retry: unknown category | "Unknown category" in output | After tool | Lists available categories |
| HOOKS-107-DELEGATE_RETRY_NON_TASK_TOOL | delegate-retry: non-task tool | Non-task tool with "[ERROR]" output | After tool | Ignored (wrong tool) |
| HOOKS-108-EMPTY_RESPONSE_DETECTOR_NULL_OUTPUT | empty-response-detector: null output | Task tool returns null | After tool | Warning injected explaining silent failure |
| HOOKS-109-EMPTY_RESPONSE_DETECTOR_NEAR_EMPTY | empty-response-detector: near-empty | Task returns "ok" (< 10 chars) | After tool | Warning injected |
| HOOKS-110-EMPTY_RESPONSE_DETECTOR_NORMAL_OUTPUT | empty-response-detector: normal output | Task returns full result | After tool | No modification |
| HOOKS-111-TASK_RESUME_INFO_SESSION_ID_EXTRACTION | task-resume-info: session_id extraction | Task output with `<task_metadata>` block | After tool | Session ID extracted, continuation line added |
| HOOKS-112-TASK_RESUME_INFO_ERROR_OUTPUT | task-resume-info: error output | Task output starting with "Error:" | After tool | Skipped (error outputs not enhanced) |
| HOOKS-113-TODOWRITE_DISABLER_SUBAGENT | todowrite-disabler: subagent | Non-orchestrator calls TodoWrite | Before tool | **Throws Error** blocking call |
| HOOKS-114-TODOWRITE_DISABLER_ORCHESTRATOR | todowrite-disabler: orchestrator | Orchestrator calls TodoWrite | Before tool | Allowed through |
| HOOKS-115-TODOWRITE_DISABLER_UNDEFINED_AGENT | todowrite-disabler: undefined agent | Agent name undefined | Before tool | Allowed (not subagent) |

### 3.9 Nudge Hooks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| HOOKS-116-POST_READ_NUDGE_BELOW_THRESHOLD | post-read-nudge: below threshold | 1st-2nd read/grep/glob | After read | Gentle workflow reminder |
| HOOKS-117-POST_READ_NUDGE_AT_THRESHOLD | post-read-nudge: at threshold | 3rd+ exploration call | After read | Escalated DELEGATION_NUDGE |
| HOOKS-118-POST_READ_NUDGE_GREP_COUNTS_BUT_NO_NUDGE | post-read-nudge: grep counts but no nudge | 3rd call is grep not read | After grep | Counter incremented but NO nudge appended (only read gets nudge) |
| HOOKS-119-POST_READ_NUDGE_IDEMPOTENT | post-read-nudge: idempotent | Output already contains nudge | After read | No duplicate |

---

## 4. Features

### 4.1 Background Agent System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| FEATURES-1-TASK_LIFECYCLE_QUEUED_RUNNING_COMPLETED | Task lifecycle: queued → running → completed | Task launched | Session idles with content | Status transitions correctly |
| FEATURES-2-TASK_LIFECYCLE_QUEUED_CANCELLED | Task lifecycle: queued → cancelled | Task queued, then cancelled | Cancel before start | Status=cancelled, slot not released (was never acquired) |
| FEATURES-3-TASK_LIFECYCLE_RUNNING_FAILED | Task lifecycle: running → failed | Session errors | Error event fires | Status=failed, concurrency released |
| FEATURES-4-CONCURRENT_CANCEL_DURING_SPAWN | Concurrent cancel during spawn | Cancel called while `spawnBackgroundSession` in-flight | Spawn completes | Session detected as cancelled, deleted |
| FEATURES-5-SESSION_IDLE_WITH_0_MESSAGES_BEFORE_MIN_IDLE_TIM | Session idle with 0 messages before MIN_IDLE_TIME | Idle event < 5s after start, no messages | Event | Ignored (too early) |
| FEATURES-6-SESSION_IDLE_WITH_0_MESSAGES_AFTER_MIN_IDLE_TIME | Session idle with 0 messages after MIN_IDLE_TIME | Idle event > 5s after start, still 0 messages | Event | Task failed: "no output" |
| FEATURES-7-LAST_MESSAGE_IS_TOOL_RESULT_NOT_ASSISTANT | Last message is tool result, not assistant | Session idle, last msg is tool_result | Event | Not completed (waits for next idle) |
| FEATURES-8-MULTIPLE_WAITFORCOMPLETION_CALLERS | Multiple waitForCompletion callers | 3 callers await same task | Task completes | All 3 notified |
| FEATURES-9-WAITFORCOMPLETION_TIMEOUT | waitForCompletion timeout | Caller waits 5s, task not done | Timeout expires | Resolves with current task state |
| FEATURES-10-TASK_TTL_EVICTION | Task TTL eviction | Completed task, 5+ minutes pass | Next eviction check | Task removed from map |
| FEATURES-11-DISPOSE_WITH_PENDING_WAITERS | dispose() with pending waiters | Callers blocking, dispose called | Dispose | All waiters resolved with current state |
| FEATURES-12-CONCURRENCY_10_TASKS_ON_SAME_MODEL_PER_DEPTH | Concurrency: 10 tasks on same model per depth | 10 tasks launched for same model+depth | 11th task | Queues behind (blocks in acquire); depth-0 and depth-1 pools are independent |
| FEATURES-13-CONCURRENCY_RELEASE_UNBLOCKS_QUEUE | Concurrency: release unblocks queue | Task completes, queued task waiting | Release | Next queued task starts |
| FEATURES-14-CONCURRENCY_RELEASE_AT_0_COUNT | Concurrency: release at 0 count | `release()` called when count=0 | Execute | Count stays 0 (`Math.max(0, current-1)`) |
| FEATURES-15-CONCURRENCY_STARVATION | Concurrency starvation | 4 parents hold slots, 17 children queue | Children | Depth-keyed pools prevent starvation — parents (`model:0`) and children (`model:1`) have separate semaphores *(fixed in PR #46)* |
| FEATURES-16-EVENT_HOOK_UNKNOWN_SESSION_IDLE | Event-hook: unknown session idle | Idle event for non-background session | Event | `tasksBySessionId.get()` returns undefined, early return |
| FEATURES-17-EVENT_HOOK_MANAGER_NOT_INITIALIZED | Event-hook: manager not initialized | Idle event before background agent setup | Event | Catches "not initialized" error, returns |

### 4.2 Loop System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| FEATURES-18-START_LOOP | Start loop | Session goes idle | Loop handler | `[SYSTEM DIRECTIVE: LOOP CONTINUE]` sent |
| FEATURES-19-LOOP_COMPLETION_DETECTION | Loop completion detection | Agent sends `<promise>DONE</promise>` | Idle event | Loop stops, completion detected |
| FEATURES-20-MAX_ITERATIONS_REACHED | Max iterations reached | DEFAULT_MAX_ITERATIONS (100) | Iteration 100 | Loop stops |
| FEATURES-21-UNBOUNDED_MAX | Unbounded max | `maxIterations: 1000` | Execute | Runs up to 1000 iterations |
| FEATURES-22-INVALID_MAXITERATIONS_0 | Invalid maxIterations: 0 | `maxIterations: 0` | `createInitialLoopState()` | `RangeError` |
| FEATURES-23-INVALID_MAXITERATIONS_NAN | Invalid maxIterations: NaN | `maxIterations: NaN` | Execute | `RangeError` |
| FEATURES-24-INVALID_MAXITERATIONS_INFINITY | Invalid maxIterations: Infinity | `maxIterations: Infinity` | Execute | `RangeError` (not safe integer) |
| FEATURES-25-ROUTED_STORE_PERSIST_TRUE | Routed store: persist=true | `persist: true` | Start | Uses FileLoopStore |
| FEATURES-26-ROUTED_STORE_PERSIST_FALSE | Routed store: persist=false | `persist: false` | Start | Uses MemoryLoopStore |
| FEATURES-27-ROUTED_STORE_SWITCH_STORES | Routed store: switch stores | Start with memory, then start with persist | Second start | Stops memory store first, then starts file store |
| FEATURES-28-FILE_STORE_INVALID_JSON_ON_DISK | File store: invalid JSON on disk | Corrupted `.sisyphus/loop-state.json` | Load | Logs error, continues with empty state |
| FEATURES-29-FILE_STORE_INVALID_SHAPE_ON_DISK | File store: invalid shape on disk | Valid JSON but wrong shape | Load | Skips invalid entries, continues |
| FEATURES-30-FILE_STORE_ATOMIC_WRITE | File store: atomic write | Write during concurrent read | Race condition | Temp file + rename prevents corruption |
| FEATURES-31-MEMORY_STORE_RETURNS_CLONES | Memory store: returns clones | Get state, modify returned object | Original | Original unchanged (cloned) |
| FEATURES-32-STOP_NON_EXISTENT_LOOP | Stop non-existent loop | `stopLoop("nonexistent")` | Execute | No-op, no error |

### 4.3 Skills System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| FEATURES-33-LOAD_BUILTIN_GIT_GUD | Load builtin git-gud | Skills loaded | Query `git-gud` | Returns comprehensive git workflow guide |
| FEATURES-34-LOAD_PROJECT_SKILL | Load project skill | `.opencode/skills/my-skill.md` exists | Load | Parsed and available |
| FEATURES-35-NO_SKILLS_DIRECTORY | No skills directory | `.opencode/skills/` doesn't exist | Load | Returns empty array |
| FEATURES-36-SKILL_WITH_NO_FRONTMATTER | Skill with no frontmatter | Markdown file without `---` markers | Load | Name from filename, empty description |
| FEATURES-37-SKILL_WITH_ONLY_FRONTMATTER | Skill with only frontmatter | File has frontmatter but empty body | Load | Skipped (empty template) |
| FEATURES-38-NON_MD_FILES | Non-.md files | `.txt` file in skills directory | Load | Ignored |
| FEATURES-39-PROJECT_OVERRIDES_BUILTIN | Project overrides builtin | Both builtin and project have `git-gud` | Merge | Project version wins |
| FEATURES-40-FRONTMATTER_COLONS_IN_DESCRIPTION | Frontmatter colons in description | `description: key: value with: colons` | Parse | First colon is separator, rest is value |
| FEATURES-41-SKILL_SYNC_TO_DISK | Skill sync to disk | Built-in skill loaded | Sync | Written to `~/.local/share/goatcode-sh/skills/git-gud/SKILL.md` |

### 4.4 Categories System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| FEATURES-42-RESOLVE_KNOWN_CATEGORY | Resolve known category | `category: "deep"` | `resolveCategory()` | Returns config: model=gpt-5.3-codex, variant=medium |
| FEATURES-43-RESOLVE_UNKNOWN_CATEGORY | Resolve unknown category | `category: "unknown"` | `resolveCategory()` | Returns `undefined` |
| FEATURES-44-CATEGORY_CONFIG_OVERRIDE | Category config override | Config overrides `deep.model` | Resolve | Overridden model used |
| FEATURES-45-ALL_8_CATEGORIES_EXIST | All 8 categories exist | Check all names | Resolve each | visual-engineering, ultrabrain, deep, artistry, quick, unspecified-low, unspecified-high, writing |
| FEATURES-46-CATEGORY_WITH_PROMPT_APPEND | Category with prompt_append | Category has prompt_append | Delegation | Appended to child prompt |
| FEATURES-47-CATEGORY_FALLBACK_CHAIN | Category fallback chain | Provider disconnected for category model | Resolve | Falls back through chain |

### 4.5 Prompt Builder

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| FEATURES-48-BUILD_ORCHESTRATOR_PROMPT | Build orchestrator prompt | All agents/skills/categories available | `buildDynamicPrompt()` | Base prompt + agent table + skills + categories |
| FEATURES-49-EMPTY_AGENTS | Empty agents | No agents registered | Build | Agent table section omitted |
| FEATURES-50-EMPTY_SKILLS | Empty skills | No skills loaded | Build | Skills section omitted |
| FEATURES-51-AGENT_DESCRIPTION_WITH_PIPE | Agent description with pipe | Description contains `\|` | Agent table | Pipe escaped in markdown table |
| FEATURES-52-SKILL_WITH_MULTILINE_DESCRIPTION | Skill with multiline description | Skill has newlines in description | Skill section | Collapsed to single line |
| FEATURES-53-AGENT_DESCRIPTION_TRUNCATION | Agent description truncation | Long description with multiple sentences | Agent table | Truncated at first `.` |

### 4.6 Auto-Update

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| FEATURES-54-FIRST_SESSION_TRIGGERS_CHECK | First session triggers check | `session.created` event, first process | Event | Update check runs |
| FEATURES-55-SUBSEQUENT_SESSIONS_SKIP | Subsequent sessions skip | `session.created` after first check | Event | No check (once-per-process) |
| FEATURES-56-AUTO_UPDATE_DISABLED | auto_update disabled | Config `auto_update: false` | Event | Check skipped |
| FEATURES-57-UPDATE_AVAILABLE | Update available | New version exists | Check | Notification shown |
| FEATURES-58-ALREADY_UP_TO_DATE | Already up to date | Same version | Check | Silent (no notification) |
| FEATURES-59-CHECK_FAILURE | Check failure | Network error during check | Check | Logged, no crash |

---

## 5. Configuration

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| CONFIG-1-PROJECT_CONFIG_LOADS | Project config loads | `goatcode.config.ts` exists | Bootstrap | Config loaded and validated |
| CONFIG-2-USER_CONFIG_LOADS | User config loads | `~/.config/opencode/goatcode.ts` exists | Bootstrap | Merged with project config |
| CONFIG-3-BOTH_CONFIGS_MERGE | Both configs merge | User and project configs overlap | Merge | Project config wins on conflicts |
| CONFIG-4-LEGACY_CONFIG_DETECTED | Legacy config detected | `ochead.config.ts` exists | Load | Used with deprecation warning |
| CONFIG-5-INVALID_CONFIG | Invalid config | Zod validation fails | Load | Returns `null`, graceful fallback |
| CONFIG-6-CONFIG_EXPORTS_FUNCTION | Config exports function | `export default () => ({...})` | Load | Function called, result used |
| CONFIG-7-CONFIG_EXPORTS_ASYNC_FUNCTION | Config exports async function | `export default async () => ({...})` | Load | Awaited, result used |
| CONFIG-8-PARTIAL_CONFIG | Partial config | Only `agents.orchestrator.model` set | Validate | Zod defaults fill other fields |
| CONFIG-9-TEMPERATURE_OUT_OF_RANGE | Temperature out of range | `default_temperature: 3` | Validate | Zod rejects (0-2 range) |
| CONFIG-10-GOATCODE_CONFIG_DIR_OVERRIDE | GOATCODE_CONFIG_DIR override | Env var set | User config load | Uses env var path instead of default |
| CONFIG-11-ENSUREUSERCONFIG_CONCURRENT | ensureUserConfig concurrent | Two processes call simultaneously | Both | First succeeds (`wx` flag), second handles EEXIST |
| CONFIG-12-DISABLED_HOOKS | disabled_hooks | `disabled_hooks: ["phase-reminder"]` | Aggregation | Phase reminder excluded |
| CONFIG-13-DISABLED_TOOLS | disabled_tools | `disabled_tools: ["hashline_edit"]` | Aggregation | Hashline edit excluded |

---

## 6. Plugin Architecture

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| PLUGINS-1-PLUGIN_REGISTRATION | Plugin registration | Valid PluginDefinition | `registry.register()` | Plugin added |
| PLUGINS-2-PLUGIN_DEPENDENCY_RESOLUTION | Plugin dependency resolution | Plugin A depends on Plugin B | `registry.resolve()` | B loaded before A |
| PLUGINS-3-CIRCULAR_DEPENDENCY | Circular dependency | A → B → A | `registry.resolve()` | Error or handled gracefully |
| PLUGINS-4-PLUGIN_SETUP_RUNS | Plugin setup runs | Plugin with `setup()` | `registry.setup()` | Setup called with OpenCodeContext |
| PLUGINS-5-PLUGIN_AGGREGATION | Plugin aggregation | All plugins registered | `registry.aggregate()` | Merged tools/hooks/agents |
| PLUGINS-6-CONFIG_HOOK_ORDERING | Config hook ordering | Compositor config hook + registered hooks | Config event | Compositor hook runs first |
| PLUGINS-7-HOOK_HANDLER_ISOLATION | Hook handler isolation | One hook throws Error | Composition | Other hooks continue (per-handler catch) |
| PLUGINS-8-TOOL_NAME_CONFLICT | Tool name conflict | Two plugins register same tool name | Aggregate | Last one wins (shallow copy) |
| PLUGINS-9-COMPOSITOR_FIRST_RUN | Compositor first run | No provider cache | Config hook | Model assignment skipped |
| PLUGINS-10-COMPOSITOR_DISABLES_BUILT_IN_AGENTS | Compositor disables built-in agents | Bootstrap | Config hook | `build` and `plan` agents disabled |
| PLUGINS-11-EXTERNAL_PLUGIN_LOADING | External plugin loading | `config.plugins: ["my-plugin"]` | Bootstrap | Package imported and registered |

---

## 7. Provider Discovery & Model Resolution

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| PROVIDERS-1-DISCOVERY_BUILDS_INDEX | Discovery builds index | Provider list response | `buildDiscoveryIndex()` | connectedProviders Set + modelIndex Map + providerModels Map |
| PROVIDERS-2-DISCOVERY_TIMEOUT | Discovery timeout | Provider list takes >15s | Bootstrap | Timeout, continues without discovery |
| PROVIDERS-3-PROVIDER_NAMES_NORMALIZED | Provider names normalized | Provider `"Anthropic"` | Discovery | Stored as `"anthropic"` (lowercase) |
| PROVIDERS-4-MODEL_RESOLUTION_EXPLICIT_OVERRIDE | Model resolution: explicit override | `override: "anthropic/claude-opus-4-6"` | `resolveModel()` | Returns override directly |
| PROVIDERS-5-MODEL_RESOLUTION_FALLBACK_CHAIN_WALK | Model resolution: fallback chain walk | First provider disconnected | `resolveModel()` | Returns second match |
| PROVIDERS-6-MODEL_RESOLUTION_FIRST_RUN_NULL | Model resolution: first-run null | Connected providers = null | `resolveModel()` | Returns undefined |
| PROVIDERS-7-CONNECTED_PROVIDERS_CACHE_DISK_READ | Connected providers cache: disk read | Cache file exists | `readConnectedProviders()` | Returns from disk |
| PROVIDERS-8-CONNECTED_PROVIDERS_CACHE_MEMORY_PRIORITY | Connected providers cache: memory priority | Both memory and disk cache | Read | Memory cache returned (no disk I/O) |
| PROVIDERS-9-CONNECTED_PROVIDERS_CACHE_INVALID_JSON | Connected providers cache: invalid JSON | Corrupted cache file | Read | Returns null, continues |
| PROVIDERS-10-CONNECTED_PROVIDERS_CACHE_ATOMIC_WRITE | Connected providers cache: atomic write | Write during concurrent read | Race | Temp file + rename prevents corruption |
| PROVIDERS-11-MODEL_NORMALIZATION_UNDEFINED | Model normalization: undefined | `normalizeModel(undefined)` | Execute | Returns `undefined` |
| PROVIDERS-12-MODEL_NORMALIZATION_EMPTY | Model normalization: empty | `normalizeModel("")` | Execute | Returns `undefined` |
| PROVIDERS-13-PARSEMODELID_NO_SLASH | parseModelId: no slash | `parseModelId("claude-opus")` | Execute | Returns `undefined` |
| PROVIDERS-14-PARSEMODELID_WITH_SLASH | parseModelId: with slash | `parseModelId("anthropic/claude-opus")` | Execute | Returns `{ provider: "anthropic", modelId: "claude-opus" }` |
| PROVIDERS-15-MODEL_AVAILABILITY_PREFIX_MATCH | Model availability: prefix match | Available: `"gpt-5.4"`, check `"gpt-5"` | `isModelAvailable()` | Returns true (separator match with `-`) |
| PROVIDERS-16-MODEL_AVAILABILITY_EMPTY_SET | Model availability: empty set | No available models | `isModelAvailable()` | Returns true (permissive fallback) |
| PROVIDERS-17-RESOLVEQUALIFIEDMODEL | resolveQualifiedModel | Already-qualified model string | Runtime fallback | Checks availability, finds alternative if unavailable |

---

## 8. Delegation System

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| DELEGATION-1-DEPTH_ENFORCEMENT_TREE | Depth enforcement tree | User→Orch(0)→Specialist(1)→Sub(2) | Sub tries to delegate | Blocked at depth 2 |
| DELEGATION-2-DEPTH_MARKER_INJECTION | Depth marker injection | Orchestrator delegates | Child prompt | Contains `<!-- goatcode:delegation_depth=1 -->` |
| DELEGATION-3-DEPTH_MARKER_IN_FIRST_3_MESSAGES | Depth marker in first 3 messages | Session with 10 messages, marker in msg 1 | Extract | Found (only checks first 3) |
| DELEGATION-4-DEPTH_MARKER_ABSENT | Depth marker absent | Session with no marker | Extract | Returns 0 (assumes root) |
| DELEGATION-5-DEPTH_EXTRACTION_API_ERROR | Depth extraction API error | `session.messages()` throws | Extract | Returns null → delegation blocked |
| DELEGATION-6-SYNC_VS_BACKGROUND_ROUTING | Sync vs background routing | `run_in_background: true/false` | Handler | Correct executor called |
| DELEGATION-7-CATEGORY_PROMPT_APPEND | Category prompt_append | Category has `prompt_append` | Execute | Appended to user's prompt |
| DELEGATION-8-SESSION_CONTINUATION | Session continuation | `session_id` on sync task | Execute | Existing session resumed, not new |

---

## 9. CLI

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| CLI-1-GOATCODE_INSTALL | `goatcode install` | Fresh directory | Run command | `goatcode.config.ts` generated |
| CLI-2-GOATCODE_INSTALL_FORCE | `goatcode install --force` | Config already exists | Run command | Config overwritten |
| CLI-3-GOATCODE_INSTALL_NON_INTERACTIVE | `goatcode install --non-interactive` | CI environment | Run command | No prompts, uses defaults |
| CLI-4-GOATCODE_UPDATE | `goatcode update` | New version available | Run command | Update installed |
| CLI-5-CONFIG_GENERATOR_AGENT_STUBS | Config generator: agent stubs | Generate project config | Check file | All 7 agent names as commented stubs |
| CLI-6-CONFIG_GENERATOR_CATEGORY_STUBS | Config generator: category stubs | Generate project config | Check file | All 8 category names as commented stubs |
| CLI-7-USER_CONFIG_GENERATOR | User config generator | Generate user config | Check file | Includes provider_priority, agent overrides |

---

## 10. Cross-Cutting Scenarios

### 10.1 State Isolation

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| CROSSCUTTING-1-TASK_STORE_RESET | Task store reset | Tests use `resetTaskStore()` | Between tests | Fresh empty store |
| CROSSCUTTING-2-CONNECTED_PROVIDERS_CACHE_RESET | Connected providers cache reset | Tests use `resetConnectedProvidersCache()` | Between tests | Fresh cache |
| CROSSCUTTING-3-KEYWORD_DETECTOR_STATE | Keyword detector state | `clearSessionMode()` | Between tests | No leftover mode |
| CROSSCUTTING-4-WRITE_FILE_GUARD_STATE | Write-file-guard state | Session tracking across tests | Reset mechanism | Sessions cleaned up |
| CROSSCUTTING-5-SKILL_LOADER_SINGLETON | Skill loader singleton | `registeredLoader` between tests | Reset | Previous loader not leaking |

### 10.2 Error Propagation

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| CROSSCUTTING-6-TOOLS_RETURN_STRINGS_NEVER_THROW | Tools return strings, never throw | Any tool error | Execute | Returns `"Error: ..."` string |
| CROSSCUTTING-7-HOOKS_THAT_THROW_BLOCKING | Hooks that throw (blocking) | write-file-guard, todowrite-disabler | Before tool | Error prevents tool execution |
| CROSSCUTTING-8-HOOKS_THAT_CATCH_NON_BLOCKING | Hooks that catch (non-blocking) | Most hooks | Throws internally | Caught, logged, other hooks continue |
| CROSSCUTTING-9-PLUGIN_SETUP_FAILURE | Plugin setup failure | Plugin `setup()` throws | Bootstrap | Error logged, other plugins continue |

### 10.3 Integration Scenarios

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| CROSSCUTTING-10-FULL_BOOTSTRAP_PIPELINE | Full bootstrap pipeline | All plugins registered | Bootstrap completes | All agents, tools, hooks available |
| CROSSCUTTING-11-BACKGROUND_TASK_EVENT_COMPLETION | Background task → event → completion | Launch task, agent works, goes idle | Full cycle | Event routes to manager, task completes, waiter notified |
| CROSSCUTTING-12-DELEGATION_DEPTH_ENFORCEMENT_EXECUTION | Delegation → depth enforcement → execution | Orchestrator delegates, specialist sub-delegates | Full chain | Depth markers injected and enforced correctly |
| CROSSCUTTING-13-CONFIG_OVERRIDE_AGENT_MODEL_CHANGE | Config override → agent model change | Config has `agents.orchestrator.model: "gpt-5.4"` | Agent builds | Orchestrator uses GPT instead of Claude |
| CROSSCUTTING-14-SKILL_LOAD_DISCOVERY_TOOL_ENHANCEMENT | Skill load → discovery → tool enhancement | Skill registered | System transform + tool definition | Skill listed in both prompt and tool description |

---

## Summary

| Category | Scenario Count |
|----------|---------------|
| Agents | 27 (AGENTS-1 through AGENTS-27) |
| Tools | 151 (TOOLS-1 through TOOLS-151) — heaviest section (23 tools) |
| Hooks | 119 (HOOKS-1 through HOOKS-119) — 32 hooks |
| Features | 59 (FEATURES-1 through FEATURES-59) — 6 features |
| Config | 13 (CONFIG-1 through CONFIG-13) |
| Plugins | 11 (PLUGINS-1 through PLUGINS-11) |
| Provider/Model | 17 (PROVIDERS-1 through PROVIDERS-17) |
| Delegation | 8 (DELEGATION-1 through DELEGATION-8) |
| CLI | 7 (CLI-1 through CLI-7) |
| Cross-Cutting | 14 (CROSSCUTTING-1 through CROSSCUTTING-14) |
| **Total** | **426 scenarios** |
