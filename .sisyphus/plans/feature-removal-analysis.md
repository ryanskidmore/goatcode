# Feature Removal Analysis — GoatCode Feature Parity Plan

## Summary

After thorough analysis of both the GoatCode codebase and the oh-my-openagent (OMO) reference implementation, this document stack-ranks features from the feature-parity plan for removal. The goal: keep the implementation small, focused, and high-value by cutting features that provide minimal value or serve niche use cases.

**Result**: 12 tasks removed from 67 → **55 implementation tasks** + 4 verification = **59 total** (~18% reduction)

---

## Stack-Ranked Removals (highest priority to remove first)

### RANK 1: Model Restriction Hooks — Tasks 38 + 38b
**Hooks**: `no-hephaestus-non-gpt`, `no-sisyphus-gpt`
**Original Wave**: 5

**What they do**: Soft warnings that log when deep-worker is assigned a non-GPT model, or when orchestrator is assigned a GPT model. These are OMO-specific opinions about which LLM provider works best for which agent role.

**Why remove**:
- GoatCode is **model-agnostic** — users choose their own models. Opinionated model restrictions contradict this philosophy.
- These are soft warnings only (no blocking behavior). Users who care about model matching will configure it themselves.
- OMO-specific: These hooks exist because OMO routes Hephaestus to GPT Codex and Sisyphus to Claude. GoatCode doesn't enforce this routing.
- ~200 LOC in OMO for zero functional impact.

**Risk**: None. No downstream dependencies.

---

### RANK 2: question-label-truncator — Task 31
**Original Wave**: 4

**What it does**: Truncates excessively long tool call labels/names to prevent UI overflow.

**Why remove**:
- Pure **cosmetic** hook. Tool labels rarely exceed UI limits in practice.
- If labels are too long, the UI already handles overflow via CSS/terminal wrapping.
- ~100 LOC in OMO for zero functional impact.

**Risk**: None. No downstream dependencies.

---

### RANK 3: todo-description-override — Task 34
**Original Wave**: 5

**What it does**: Overrides todo item descriptions with richer metadata (file paths, line numbers, etc.).

**Why remove**:
- End users never see todo descriptions — they're internal agent state.
- The existing `todo-enforcer` hook already validates todo format.
- Marginal improvement to agent debugging, not user-facing value.

**Risk**: None. No downstream dependencies.

---

### RANK 4: auto-update-checker hook — Task 26
**Original Wave**: 4

**What it does**: Checks npm registry for newer GoatCode version on session start.

**Why remove**:
- GoatCode **already has** `src/features/auto-update/` with update checking logic.
- The existing feature handles this without needing a separate hook plugin.
- Adding another hook is redundant — we'd have two update checking mechanisms.
- Users can run `goatcode update` manually.

**Risk**: None. Auto-update feature already exists and continues to work.

---

### RANK 5: read-image-resizer — Task 36
**Original Wave**: 5

**What it does**: Resizes large images returned by the Read tool to prevent token waste.

**Why remove**:
- Coding agents **rarely interact with images**. The primary workflow is text/code files.
- When images are relevant (UI screenshots), the `look-at` tool already handles them appropriately.
- Token optimization for images is a niche concern that doesn't justify a full hook plugin.

**Risk**: None. No downstream dependencies.

---

### RANK 6: prometheus-md-only — Task 32
**Original Wave**: 5

**What it does**: Restricts the plan-builder agent to only write .md files, blocking Write/Edit tool calls for non-.md targets.

**Why remove**:
- **Over-restrictive** guard. Plan-builder agents naturally write .md files as part of planning.
- In practice, plan-builders rarely attempt to write non-.md files. The restriction solves a problem that doesn't frequently occur.
- If users want to restrict agent write access, `disabled_tools` config already exists.
- Limits flexibility for plan-builders that need to create config files or scripts as part of planning.

**Risk**: None. No downstream dependencies.

---

### RANK 7: slashcommand tool — Task 46
**Original Wave**: 6

**What it does**: A tool that lists all registered slash commands with their descriptions.

**Why remove**:
- Agents already know about available commands through the **command registry** and prompt injection.
- The `auto-slash-command` hook (Task 27, which we're keeping) already routes command patterns.
- Redundant discovery mechanism — commands are documented in agent prompts.

**Risk**: None. No downstream dependencies.

---

### RANK 8: non-interactive-env hook — Task 35
**Original Wave**: 5

**What it does**: Detects non-TTY environments and adjusts behavior (disables TUI prompts, skips interactive features).

**Why remove**:
- This logic can be a **5-line check in bootstrap**, not a full hook plugin with plugin.ts + handler.ts + types.ts.
- `process.stdout.isTTY` is trivial to check at startup.
- The existing CLI commands already handle non-interactive mode via `--non-interactive` flags.
- Over-engineered solution for a simple problem.

**Risk**: Minimal. Non-interactive detection can be added as a bootstrap check if needed.

---

### RANK 9: TUI @clack/prompts rewrite — Task 48
**Original Wave**: 7

**What it does**: Rewrites the install command using @clack/prompts for spinners, multi-select, colored output.

**Why remove**:
- **Adds a new dependency** (`@clack/prompts`) for cosmetic polish.
- The existing readline-based install command is **functional and working**.
- `picocolors` is already in dependencies for basic color support.
- Cosmetic TUI improvements don't impact agent functionality.
- Can be added later if UX feedback demands it.

**Risk**: None. Existing install command continues to work.

---

### RANK 10: TUI run command — Task 50
**Original Wave**: 7

**What it does**: Adds a `goatcode run "message"` command for non-interactive session launching (CI/CD use case).

**Why remove**:
- Niche **CI/CD use case**. GoatCode's primary audience uses it interactively.
- Can be trivially added later when CI/CD integration is requested.
- Adds complexity to the CLI without serving the core use case.

**Risk**: None. No downstream dependencies.

---

### RANK 11: call_goat_agent tool — Task 39
**Original Wave**: 5

**What it does**: Allows direct agent-to-agent invocation by name, bypassing category routing.

**Why remove**:
- `delegate-task` **already handles agent delegation** via category routing.
- Having both `delegate-task` (by category) and `call_goat_agent` (by name) is over-engineering.
- Category routing is the recommended pattern — direct name-based invocation encourages brittle agent coupling.
- OMO has both tools because it predates the category system. GoatCode doesn't need this legacy.

**Risk**: Minimal. delegate-task covers all delegation use cases via categories.

---

## Wave Restructuring After Removals

### Before (Original)
| Wave | Tasks | Count |
|------|-------|-------|
| 1a | T1, T2, T4, T5, T6 | 5 |
| 1b | T3, T7, T8 | 3 |
| 2 | T9-T16 | 8 |
| 3 | T17-T23 | 7 |
| 4 | T24-T31 | 8 |
| 5 | T32-T39 | 8+1 (38b) |
| 6 | T40-T47 | 8 |
| 7 | T48-T55 | 8 |
| 8 | T56-T63 | 8 |
| FINAL | F1-F4 | 4 |
| **Total** | | **67+4** |

### After (Trimmed)
| Wave | Tasks | Count | Changes |
|------|-------|-------|---------|
| 1a | T1, T2, T4, T5, T6 | 5 | unchanged |
| 1b | T3, T7, T8 | 3 | unchanged |
| 2 | T9-T16 | 8 | unchanged |
| 3 | T17-T23 | 7 | unchanged |
| 4 | T24, T25, T27-T30, T33, T37 | 8 | merged old Wave 4 (-2) + old Wave 5 remainders (+2) |
| 5 | T40-T45, T47 | 7 | was Wave 6 (-1) |
| 6 | T49, T51-T55 | 6 | was Wave 7 (-2) |
| 7 | T56-T63 | 8 | was Wave 8, test batches adjusted |
| FINAL | F1-F4 | 4 | unchanged |
| **Total** | | **55+4** |

**Key change**: Old Wave 5 collapsed from 9 tasks to 2 (T33, T37). These moved into Wave 4 to maintain wave balance. Old Waves 6-8 renumbered to 5-7.

---

## Impact on Test Waves

Test batch tasks (56-58) need adjustment since they reference removed hooks:
- **Task 56 (batch 1)**: Remove read-image-resizer, auto-update-checker from batch
- **Task 57 (batch 2)**: Remove question-label-truncator from batch
- **Task 58 (batch 3)**: Remove prometheus-md-only, todo-description-override, non-interactive-env, no-hephaestus-non-gpt, no-sisyphus-gpt from batch
- **Task 59 (tool tests)**: Remove call-goat-agent, slashcommand from batch

Test batches become smaller but each task is still viable.

---

## Summary Table

| Rank | Task(s) | Feature | Wave | Value | Risk |
|------|---------|---------|------|-------|------|
| 1 | 38+38b | Model restriction hooks | 5 | Zero | None |
| 2 | 31 | question-label-truncator | 4 | Zero | None |
| 3 | 34 | todo-description-override | 5 | Minimal | None |
| 4 | 26 | auto-update-checker hook | 4 | Redundant | None |
| 5 | 36 | read-image-resizer | 5 | Niche | None |
| 6 | 32 | prometheus-md-only | 5 | Niche | None |
| 7 | 46 | slashcommand tool | 6 | Redundant | None |
| 8 | 35 | non-interactive-env | 5 | Over-engineered | Minimal |
| 9 | 48 | TUI @clack/prompts | 7 | Cosmetic | None |
| 10 | 50 | TUI run command | 7 | Niche | None |
| 11 | 39 | call_goat_agent tool | 5 | Redundant | Minimal |
