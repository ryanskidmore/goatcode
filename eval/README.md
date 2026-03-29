# GoatCode Evaluation Framework

This directory contains the evaluation framework for GoatCode, including A/B testing and ablation studies to measure the impact of the plugin on agent performance.

## Overview

The evaluation framework provides two main evaluation modes:

1. **A/B Evaluation** (`test:eval`): Compares GoatCode-enabled agents against a baseline (no plugin) on identical tasks. This measures the overall impact of the plugin on task completion, tool accuracy, and planning quality.

2. **Ablation Study** (`test:ablation`): Disables specific hook groups (recovery, quality, context) to measure the individual impact of each hook category on agent performance.

## Prerequisites

- Node.js 20.20 or later
- `npx promptfoo` available (installed via `npm install -D promptfoo`)
- OpenCode server (optional; evals fall back to mock responses if unavailable)

## Running Evaluations

### A/B Evaluation

Run the A/B comparison between GoatCode-enabled and baseline agents:

```bash
bun run test:eval
```

This runs the config in `promptfooconfig.yaml` and compares:
- **with-goatcode**: Agent with the GoatCode plugin enabled
- **baseline**: Agent without the plugin

### Ablation Study

Run the ablation study to measure hook group impact:

```bash
bun run test:ablation
```

This runs the config in `ablation-config.yaml` and compares:
- **full**: All hooks enabled (baseline for ablation)
- **no-recovery-hooks**: Recovery hooks disabled (edit-error, json-error, session-recovery, context-window-limit, error-diagnostics)
- **no-quality-hooks**: Quality hooks disabled (comment-checker, write-file-guard, thinking-block-validator)
- **no-context-hooks**: Context hooks disabled (context-injector, compaction-context, phase-reminder)

### Direct Invocation

You can also run evals directly from the `eval/` directory:

```bash
cd eval
npx promptfoo eval -c promptfooconfig.yaml
npx promptfoo eval -c ablation-config.yaml
```

## Interpreting Results

### Output Markers

- **[MOCK]**: The OpenCode server was not available, so the provider used mock responses. Results are informational only and do not reflect real agent behavior.
- **[PASS]**: The assertion passed (e.g., task completed, tool used correctly, plan generated).
- **[FAIL]**: The assertion failed (e.g., task incomplete, incorrect tool usage, no plan).

### Scores

Each test case is scored based on custom assertions:

- **task-completion.ts**: Measures whether the agent successfully completed the requested task.
- **tool-accuracy.ts**: Measures whether the agent used the correct tools and parameters.
- **ablation-scorer.ts**: Measures task completion and quality for ablation variants.
- **hook-impact.ts**: Measures the specific impact of disabled hook groups on code quality analysis.

Higher scores indicate better performance. Scores are aggregated across all test cases to produce an overall evaluation result.

### CI Behavior

These evaluations are **informational only** and do not block CI. They pass even when the OpenCode server is unavailable (falling back to mock responses). This allows evals to run in isolated CI environments without external dependencies.

## Adding New Scenarios

### Adding Test Cases to A/B Evaluation

Edit `promptfooconfig.yaml` and add a new test case under the `tests` section:

```yaml
tests:
  - vars:
      task: "Your new task description here"
    assert:
      - type: javascript
        value: "file://assertions/task-completion.ts"
        threshold: 0.5
```

The `task` variable is passed to both providers. You can reference custom assertions or use built-in assertion types like `contains`, `equals`, or `javascript`.

### Adding Test Cases to Ablation Study

Edit `ablation-config.yaml` and add a new test case under the `tests` section:

```yaml
tests:
  - vars:
      task: "Your new task description here"
    assert:
      - type: javascript
        value: "file://assertions/ablation-scorer.ts"
```

The same task is run against all four provider variants (full, no-recovery-hooks, no-quality-hooks, no-context-hooks), allowing you to measure the impact of each hook group.

## Creating New Ablation Configs

To create a new ablation config that disables different hook groups:

1. Copy `ablation-config.yaml` to a new file (e.g., `ablation-custom-config.yaml`)
2. Modify the `disabledHooks` lists in each provider config:

```yaml
providers:
  - id: file://providers/opencode-provider.ts
    label: custom-variant
    config:
      enablePlugin: true
      disabledHooks: ["hook-name-1", "hook-name-2"]
```

3. Update the `test:ablation` script in `package.json` to point to your new config:

```json
"test:ablation": "cd eval && npx promptfoo eval -c ablation-custom-config.yaml"
```

Available hooks are documented in the main [README.md](../README.md#hooks).

## File Structure

```
eval/
├── promptfooconfig.yaml      — A/B evaluation config (with-goatcode vs baseline)
├── ablation-config.yaml      — Ablation study config (hook group impact)
├── README.md                 — This file
├── providers/
│   ├── opencode-provider.ts  — Provider that calls the OpenCode server
│   └── opencode-baseline.ts  — Baseline provider (no plugin)
├── assertions/
│   ├── task-completion.ts    — Assertion: task completed successfully
│   ├── tool-accuracy.ts      — Assertion: correct tool usage
│   ├── ablation-scorer.ts    — Assertion: ablation study scoring
│   └── hook-impact.ts        — Assertion: hook group impact measurement
└── spike/
    └── config.yaml           — Original feasibility spike (archived)
```

## Notes

- All relative paths in YAML configs (e.g., `file://providers/...`) are resolved relative to the `eval/` directory. The `cd eval &&` prefix in the npm scripts ensures correct path resolution.
- Evals are designed to be environment-agnostic and work with or without a live OpenCode server.
- Results are stored in `.promptfoo/` (created by promptfoo) and can be viewed in the promptfoo UI.
