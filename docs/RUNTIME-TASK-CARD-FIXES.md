# Runtime Changes Required for Task Card Metadata

This document describes three issues in the OpenCode runtime (TUI + session processor) that prevent plugin-delegated task cards from displaying correct metadata, tool call counts, and durations. These issues cannot be fixed from the GoatCode plugin side alone.

## Background

When GoatCode delegates a task via the `task` tool, the OpenCode TUI renders an inline task card:

```
│ <SubagentType> Task — <description>
↳ <N> toolcalls                          (while running)
└ <N> toolcalls · <duration>             (when completed)
```

Currently, cards always show:

```
│ General Task — <description>
└ 0 toolcalls · 0ms
```

Three separate runtime issues contribute to this.

---

## Issue 1: Plugin Tool Wrapper Strips Metadata on Completion

### Location

`packages/opencode/src/tool/registry.ts` — `fromPlugin()` function (around line 74–96)

### Problem

When a plugin tool's `execute()` function returns, the `fromPlugin` wrapper discards the return value and replaces it with a fixed metadata object:

```ts
// registry.ts — fromPlugin wrapper
execute: async (args, toolCtx) => {
    const result = await def.execute(args as any, pluginCtx)
    const out = await Truncate.output(result, {}, initCtx?.agent)
    return {
        title: "",                                           // ← always empty
        output: out.truncated ? out.content : result,
        metadata: { truncated: out.truncated, outputPath: out.truncated ? out.outputPath : undefined },
                                                             // ← only truncation info
    }
}
```

Then in the session processor (`processor.ts`, `tool-result` handler around line 215–231), the completion state **overwrites** the tool part's metadata entirely:

```ts
case "tool-result": {
    yield* session.updatePart({
        ...match,
        state: {
            status: "completed",
            input: value.input ?? match.state.input,
            output: value.output.output,
            metadata: value.output.metadata,    // ← overwrites with { truncated: false }
            title: value.output.title,           // ← overwrites with ""
            time: { start: match.state.time.start, end: Date.now() },
        },
    })
}
```

Any metadata set during execution via `ctx.metadata()` (including `sessionId`, `subagent_type`, `model`) is destroyed when the tool completes.

### Impact

- **Completed task cards lose their `sessionId`** → clicking them does nothing (no session to navigate to)
- **Completed task cards lose `subagent_type`** → fall back to "General Task"
- The `title` set during execution is overwritten with `""`, though the TUI doesn't currently use `state.title` for display

### Recommended Fix

The `fromPlugin` wrapper should preserve metadata set during execution. Two approaches:

**Option A (minimal):** Merge execution-time metadata with the completion metadata instead of replacing it.

In `registry.ts`, change the wrapper to capture metadata set via `ctx.metadata()` and merge it into the return value:

```ts
// Track metadata set during execution
let execMetadata: Record<string, any> = {}
const originalMetadata = toolCtx.metadata.bind(toolCtx)
toolCtx.metadata = (val) => {
    if (val.metadata) execMetadata = { ...execMetadata, ...val.metadata }
    originalMetadata(val)
}

const result = await def.execute(args as any, pluginCtx)
const out = await Truncate.output(result, {}, initCtx?.agent)
return {
    title: execMetadata.title ?? "",
    output: out.truncated ? out.content : result,
    metadata: {
        ...execMetadata,                    // ← preserve execution-time metadata
        truncated: out.truncated,
        ...(out.truncated && { outputPath: out.outputPath }),
    },
}
```

**Option B (broader):** Allow plugin tools to return structured objects (not just strings). If the plugin's `execute()` returns `{ title, metadata, output }`, pass it through instead of wrapping.

---

## Issue 2: Task Component Uses `onMount` Instead of Reactive Effect for Session Sync

### Location

`packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` — `Task` component (around line 1957–1964)

### Problem

The Task component triggers child session sync only on mount:

```tsx
onMount(() => {
    if (props.metadata.sessionId && !sync.data.message[props.metadata.sessionId]?.length)
        sync.session.sync(props.metadata.sessionId)
})
```

For the **built-in** `TaskTool`, this works because it creates the session synchronously in-process — `ctx.metadata({ metadata: { sessionId } })` is called before any child work begins, so `sessionId` is available when the component mounts.

For **plugin tools** (like GoatCode's delegate-task), the child session is created asynchronously:
1. The tool call event fires → component mounts → `onMount` runs
2. At this point, `props.metadata.sessionId` is `undefined` (metadata hasn't been emitted yet)
3. The plugin spawns a subprocess, waits for session creation (up to 5s), then calls `ctx.metadata()`
4. `sessionId` now exists in `props.metadata`, but `onMount` already fired and won't re-run

Since sync never triggers, `tools()` and `messages()` remain empty arrays.

### Impact

- **"0 toolcalls"** — `tools()` is empty because the child session was never synced
- **"0ms" duration** — `duration()` reads from `messages()` which is empty
- **No live status line** — the `↳ Read file.ts` running indicator never appears

### Recommended Fix

Replace `onMount` with a reactive `createEffect` that triggers whenever `sessionId` becomes available:

```tsx
createEffect(() => {
    const id = props.metadata.sessionId
    if (id && !sync.data.message[id]?.length) {
        sync.session.sync(id)
    }
})
```

This is a one-line change (swap `onMount` for `createEffect`, remove the closure wrapper). SolidJS's `createEffect` will re-run whenever `props.metadata.sessionId` changes from `undefined` to a real value, triggering the sync at the right time.

---

## Issue 3: Duration Computation Returns 0 for Running Tasks

### Location

`packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` — `Task` component, `duration` memo (around line 1980–1985)

### Problem

```tsx
const duration = createMemo(() => {
    const first = messages().find((x) => x.role === "user")?.time.created
    const assistant = messages().findLast((x) => x.role === "assistant")?.time.completed
    if (!first || !assistant) return 0
    return assistant - first
})
```

This reads `time.completed` from the last assistant message. While a task is still running, `time.completed` is `undefined` → duration returns 0.

Even after Issue 2 is fixed (sync triggers correctly), running tasks will still show "0ms" because the assistant message hasn't completed yet.

### Impact

- Running task cards show no meaningful duration
- Only completed tasks show duration (and only if Issue 1 is also fixed, since sessionId must survive completion)

### Recommended Fix

For running tasks, compute elapsed time from `Date.now()` instead of requiring `time.completed`:

```tsx
const duration = createMemo(() => {
    const first = messages().find((x) => x.role === "user")?.time.created
    if (!first) return 0
    const assistant = messages().findLast((x) => x.role === "assistant")
    const end = assistant?.time.completed ?? (isRunning() ? Date.now() : 0)
    if (!end) return 0
    return end - first
})
```

For this to tick live while running, wrap it in a polling signal or use SolidJS's `createTimer` pattern to re-evaluate periodically.

---

## Summary

| # | Issue | File | Fix Type | Blocks |
|---|-------|------|----------|--------|
| 1 | Plugin wrapper strips metadata | `registry.ts` | Merge metadata instead of replace | Clickability on completed cards, correct label |
| 2 | `onMount` misses async sessionId | `index.tsx` | `createEffect` instead of `onMount` | Tool counts, duration, live status |
| 3 | Duration returns 0 while running | `index.tsx` | Use `Date.now()` fallback for running | Live duration display |

**Issue 1 is the most critical** — it breaks the data chain for all plugin tools on completion. Issues 2 and 3 compound it but are independently fixable.

### GoatCode-Side Mitigations Already Applied

- `subagent_type` made required in the tool schema so the LLM always includes it in tool call args (works around Issue 1 for the "General Task" label specifically)
- Early metadata emission: `ctx.metadata()` called immediately with title/subagent before waiting for sessionId (reduces the timing window for Issue 2, but doesn't eliminate it since the tool is still async)
- Task metadata block appended to tool output text so downstream hooks can extract sessionId from the output string even if `state.metadata` is wiped
