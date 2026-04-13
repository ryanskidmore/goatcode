# GoatCode local evals (Phase 1)

This directory contains a **local-only** Phase 1 promptfoo eval suite that runs
real OpenCode provider calls through your existing user OpenCode config.

## Hard requirements

- Requires `~/.config/opencode/opencode.json`
- Requires provider credentials configured in that OpenCode config
- Uses real provider execution (`opencode run`) with no mocks/fakes
- Not intended for CI in Phase 1

## Run

From repo root:

```bash
bun run eval:phase1
```

or directly:

```bash
cd eval
npx promptfoo eval -c promptfooconfig.yaml -o artifacts/results/phase1-latest.json --max-concurrency 1
```

## Artifacts

- Promptfoo summary output: `eval/artifacts/results/phase1-latest.json`
- Per-scenario execution logs: `eval/artifacts/runs/<timestamp>/<scenario-id>.json`

Each per-scenario log includes:

- tool calls (required/forbidden checks)
- tool output checks
- filesystem side-effect checks (for mutating scenarios)
- raw command and stderr snapshots

## Phase 1 included scenarios

- AGENTS-12-ORCHESTRATOR_FULL_ACCESS
- AGENTS-9-ADVISOR_ALLOWED_TOOLS
- TOOLS-1-PATTERN_MATCH_FOUND
- TOOLS-2-NO_MATCHES
- TOOLS-11-PATTERN_MATCHES_FILES
- TOOLS-29-REPLACE_LINE
- TOOLS-33-APPEND_FILE
- TOOLS-40-FILE_NOT_FOUND_EDIT_MODE
- CLI-1-GOATCODE_INSTALL
- CROSSCUTTING-1-TASK_STORE_RESET
