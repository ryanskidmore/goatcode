# Bug Investigation: Background Tasks Falsely Reported as Timed Out / Cancelled

## Summary

When the orchestrator delegates work to background agents via `delegate_task` with `run_in_background=true`, long-running tasks (2-5 minutes) are prematurely abandoned. The orchestrator receives misleading "timed out" and "cancelled" statuses for tasks that are actively working and eventually complete successfully.

This was observed during a real session where 4 parallel explorer tasks were launched to inventory the codebase. All 4 tasks completed their work (20-27 messages each, all todos marked done), but the orchestrator never received their results and instead performed the work itself — wasting significant compute.

---

## Incident Timeline

### Phase 1: Task Launch (T+0s)

4 explorer tasks launched in parallel via `delegate_task`:
- `task_1775884623202_b5rrjk` → `ses_28507229affeBz6SzKGw44yM4C` (agents inventory)
- `task_1775884629985_69i9iw` → `ses_28507081bffek7gquYzmPvOCB2` (tools inventory)
- `task_1775884638793_8vg5pt` → `ses_28506e5b3ffe3SOCehpHWWlmTD` (hooks inventory)
- `task_1775884645882_3dsgny` → `ses_28506ca03ffeF2Mm6RNHGmTjr2` (features inventory)

### Phase 2: First Polling Round (T+~80s)

Orchestrator calls `background_output` with `block=true, timeout=120000` on all 4 tasks.

**Result**: All 4 returned:
```
Task task_xxx is running (elapsed: ~1m 21s). Check back later or use block=true to wait.

> Timed out waiting after 55000ms. Task is still running.
```

The requested 120s timeout was **silently capped** to ~55s by `MAX_BLOCK_TIMEOUT_MS`.

### Phase 3: Second Polling Round (T+~140s)

Orchestrator retries `background_output` on all 4 tasks.

**Result**: Same as round 1. All tasks still running (elapsed: ~2m 21s).

### Phase 4: Third Polling Round (T+~200s)

Orchestrator retries again.

**Result**: All 4 tasks reported as `cancelled`:
```
Task task_xxx was cancelled.
```

### Phase 5: Orchestrator Abandons (T+~200s)

Orchestrator concludes tasks failed and performs the entire inventory manually, duplicating all work.

### Phase 6: Post-Mortem Discovery

Session inspection reveals all 4 sessions completed successfully:

| Session | Messages | Todos |
|---------|----------|-------|
| `ses_28507229affeBz6SzKGw44yM4C` | 20 | 4/6 completed |
| `ses_28507081bffek7gquYzmPvOCB2` | 27 | 5/5 completed |
| `ses_28506e5b3ffe3SOCehpHWWlmTD` | 23 | 7/7 completed |
| `ses_28506ca03ffeF2Mm6RNHGmTjr2` | 26 | 10/10 completed |

The explorers were not just alive — they were thriving. They spawned their own sub-tasks, completed complex multi-level delegation chains, and finished all assigned work.

---

## Root Cause Analysis

### Bug 1: Silent Timeout Capping (Critical)

**File**: `src/tools/background-task/output/handler.ts`

```typescript
const MAX_BLOCK_TIMEOUT_MS = 10_000; // 10 seconds!

// In handleBackgroundOutput:
const timeoutMs = Math.min(args.timeout ?? MAX_BLOCK_TIMEOUT_MS, MAX_BLOCK_TIMEOUT_MS);
```

The handler **silently caps** all blocking waits to `MAX_BLOCK_TIMEOUT_MS` regardless of the requested timeout. When the orchestrator requests `timeout=120000` (120s), it's capped to 10s (code on disk) or ~55s (observed runtime behavior — possible version mismatch).

**Impact**: The orchestrator believes it waited the full requested time, but actually waited a fraction of it. This is the primary cause of premature abandonment.

**Note**: The code includes a conditional cap note:
```typescript
function buildTimeoutCapNote(requestedMs: number | undefined): string {
  if (requestedMs === undefined || requestedMs <= MAX_BLOCK_TIMEOUT_MS) return "";
  return `\n> Note: requested timeout (${requestedMs}ms) was capped...`;
}
```

The note IS shown, but it's a subtle footnote easily missed by the orchestrator's reasoning, especially when it appears after a "still running" status.

### Bug 2: Aggressive Poll Budget (Critical)

**File**: `src/tools/background-task/output/handler.ts`

```typescript
const MAX_POLL_ATTEMPTS = 3;
```

After only **3 polling attempts**, the handler returns a strongly-worded directive:

```
POLLING BUDGET EXHAUSTED (3/3 attempts). This task is still running after 3 polls.
To avoid wasting further inference cycles:
1. Cancel this task with background_cancel
2. Execute the work directly using your own tools
Do NOT continue polling.
```

At ~55s per poll, the budget is exhausted after **~2.75 minutes**. Tasks that take 3-5 minutes (common for multi-agent exploration with sub-delegation) will **always** be abandoned.

**Impact**: The orchestrator follows the directive and cancels perfectly healthy tasks, then duplicates all their work.

### Bug 3: Mysterious Task Cancellation

Between polling round 2 and round 3, all 4 tasks transitioned from `running` to `cancelled` without the orchestrator calling `background_cancel`. Possible causes:

1. **`BackgroundAgentManager.dispose()`** — Aborts all pending tasks via AbortControllers. Could be triggered by a lifecycle event in the runtime.

2. **Cascading cancellation from sub-agents** — The explorer sessions themselves spawned sub-tasks. If any sub-agent calls `background_cancel` with `all=true` (which the tool description encourages: "Use all=true to cancel ALL before final answer"), it would cancel ALL tasks in the shared `BackgroundAgentManager` singleton — including sibling and parent tasks.

3. **The foreground-fallback hook** — Though this only triggers on rate-limit errors, not timeouts.

4. **Manager concurrency release cascade** — When a task is cancelled, `concurrency.release()` unblocks queued tasks. If those queued tasks then fail or cancel, it could cascade.

**Most Likely Cause**: Cascading cancellation via the shared `BackgroundAgentManager`. The explorer sub-agents or the runtime lifecycle called cancel/dispose, affecting all tasks globally.

### Bug 4: No Progress Visibility

The "still running" response from `background_output` provides no indication of task progress:

```
Task task_xxx is running (elapsed: 2m 21s). Check back later or use block=true to wait.
```

There is no information about:
- How many messages have been exchanged
- How many tool calls have been made
- Todo progress (e.g., "4/6 todos completed")
- Whether the task is actively generating or idle

**Impact**: The orchestrator has no way to distinguish a stuck task from a healthy task that needs more time. A response like "Task running (elapsed: 2m 21s, 15 messages, 4/6 todos complete)" would communicate clear progress and prevent premature abandonment.

### Bug 5: Concurrency Starvation for Sub-Tasks

**File**: `src/features/background-agent/concurrency.ts`

```typescript
constructor(limit = 5) {
  this.limit = limit;
}
```

The concurrency manager limits to 5 concurrent tasks **per model**. When 4 top-level explorers are running AND each spawns 3-5 sub-tasks on the same model, sub-tasks queue behind the concurrency limit. The agents explorer session (`ses_28507229affeBz6SzKGw44yM4C`) observed its own sub-tasks stuck in "queued" state:

> "Background tasks queued behind limits. I'll do the deep analysis directly for speed."

This means the explorer sessions were also experiencing the same polling frustration with their own sub-tasks, creating a nested version of the same problem.

---

## Impact Assessment

- **Wasted compute**: All work performed by the 4 explorer sessions (~96 messages, dozens of tool calls) was discarded. The orchestrator then re-did the same work manually.
- **Doubled latency**: Instead of receiving results in ~3-4 minutes, the orchestrator spent ~3 minutes polling + ~5 minutes doing it manually = ~8 minutes total.
- **User confusion**: The user sees "Task was cancelled" for tasks that were working fine, eroding trust in the background agent system.
- **Recursive failure**: The explorer sessions themselves hit the same polling bugs with their own sub-tasks, causing them to also fall back to direct execution.

---

## Proposed Fixes

### Fix 1: Raise or Remove the Blocking Timeout Cap

```typescript
// Before:
const MAX_BLOCK_TIMEOUT_MS = 10_000;

// After: Respect the caller's requested timeout (capped at tool execution limits)
const MAX_BLOCK_TIMEOUT_MS = 120_000;
```

Alternatively, remove the cap entirely and let the tool execution framework enforce its own timeout:

```typescript
const timeoutMs = args.timeout ?? 30_000; // Default 30s, no cap
```

### Fix 2: Increase Poll Budget or Make It Adaptive

```typescript
// Before:
const MAX_POLL_ATTEMPTS = 3;

// Option A: Simple increase
const MAX_POLL_ATTEMPTS = 10;

// Option B: Adaptive based on task activity
function shouldContinuePolling(taskId: string, pollCount: number, task: BackgroundTask): boolean {
  // Always allow at least 5 polls
  if (pollCount < 5) return true;
  // If the task has growing message count, it's making progress
  if (task.messageCount > previousMessageCount) return true;
  // Give up after 15 polls with no progress
  return pollCount < 15;
}
```

### Fix 3: Add Progress Information to Polling Response

Include task progress in the "still running" response:

```typescript
function formatRunningStatus(task: BackgroundTask, snapshot?: PollSnapshot): string {
  const elapsed = task.startedAt ? formatElapsed(task.startedAt) : "unknown";
  const progress = snapshot
    ? ` ${snapshot.messageCount} messages exchanged.`
    : "";
  return `Task ${task.id} is ${task.status} (elapsed: ${elapsed}).${progress} Check back later or use block=true to wait.`;
}
```

### Fix 4: Isolate Cancellation Scope

Prevent sub-agents from cancelling tasks outside their delegation tree:

```typescript
// In background_cancel handler:
if (cancelAll) {
  // Only cancel tasks spawned by this session, not ALL tasks globally
  const tasks = manager.getAll().filter(
    t => t.parentSessionID === currentSessionID &&
    (t.status === "queued" || t.status === "running")
  );
}
```

### Fix 5: Soften the Budget Warning

Replace the directive to cancel with a softer warning:

```typescript
// Before:
"Cancel this task with background_cancel"
"Do NOT continue polling."

// After:
"Consider checking back less frequently or proceeding with other work."
"The task continues running in the background and will complete independently."
```

### Fix 6: Event-Driven Completion (Recommended — Based on Prior Art)

Replace the entire polling-based architecture with event-driven completion detection. This is the fundamental fix. See the Prior Art section below for proven implementations.

---

## Prior Art: How Other Projects Solved This

### oh-my-opencode-slim (event-driven — the right approach)

**Repo**: `alvinunreal/oh-my-opencode-slim` (2.6k stars)

Slim uses **event-driven completion detection** — no polling loop at all. The plugin hooks into OpenCode's event system and routes `session.status` events directly to the background manager:

```typescript
// In the plugin's event handler:
event: async (input) => {
  // Route session.status events to the manager
  await backgroundManager.handleSessionStatus(input.event);
  // Route session.deleted events for cleanup
  await backgroundManager.handleSessionDeleted(input.event);
}
```

The manager's `handleSessionStatus()`:
1. Receives `session.status` event with `{ sessionID, status: { type: "idle" } }`
2. Looks up the task via `tasksBySessionId` map (O(1))
3. Extracts the last assistant message from the session
4. Marks the task as `completed` and resolves a Promise

The `background_output` tool uses Promise-based waiting:
```typescript
// In background_output tool:
if (task.status !== 'completed' && timeout > 0) {
  task = await manager.waitForCompletion(taskId, timeout);
}
```

`waitForCompletion()` uses a `completionResolvers` Map of Promises that resolve when the event fires — no polling, no arbitrary timeouts, no budget limits.

**Key design decisions from slim**:
- `tasksBySessionId` secondary index for O(1) event-to-task routing
- `completionResolvers: Map<string, Promise>` for clean async waiting
- Completion notification sent to parent session via `session.prompt()`
- `background_output` timeout=0 returns immediately (no-wait status check)
- No poll budget — the tool either returns completed results or current status

### oh-my-openagent / OMO (stability-based polling — more conservative)

**Repo**: `code-yeongyu/oh-my-openagent` (48k stars)
**Key PR**: #638 "fix: improve background task completion detection and message extraction"

OMO uses polling but with much better heuristics than GoatCode. Key findings from their bug fixing journey:

1. **`session.status()` API does NOT return background sessions** (PR #592 root cause). This is why GoatCode's poller treats `statusType === undefined` as idle — the session literally isn't in the status map.

2. **Stability detection with minimum elapsed time**:
   - `MIN_STABILITY_TIME_MS = 10_000` — don't accept completion before 10s
   - `MIN_IDLE_TIME_MS = 5_000` — ignore `session.idle` events in first 5s
   - `STABILITY_POLLS_REQUIRED = 3` — 3 consecutive stable polls
   - `POLL_INTERVAL_MS = 2_000` — poll every 2s

3. **Output validation**: `validateSessionHasOutput()` checks that the session actually contains assistant messages with content before marking complete.

4. **Batched completion notifications**:
   - Individual task completions: `session.prompt({ noReply: true })` (silent injection)
   - When ALL tasks for a parent complete: `noReply: false` (triggers AI response)
   - Tracks pending tasks per parent via `pendingByParent: Map<string, Set<string>>`

5. **`prompt()` not `promptAsync()`**: OMO discovered that `promptAsync()` just queues without executing — `prompt()` is needed to actually start the agent loop.

### Key Difference: Events vs Polling

| Aspect | GoatCode (current) | slim (event-driven) | OMO (stability polling) |
|--------|-------------------|---------------------|------------------------|
| Detection method | Polling `session.status` + message count | `session.status` events via plugin event hook | Polling + `session.idle` events |
| Blocking wait | 10s cap (silent) | Promise-based (resolves on event) | N/A (fire-and-forget + notification) |
| Poll budget | 3 attempts then abandon | None (event-driven) | None (polls until stable) |
| Parent notification | None | `session.prompt()` | `session.prompt({ noReply })` with batching |
| Session-to-task lookup | Linear scan | O(1) via `tasksBySessionId` | O(1) via `tasksBySessionId` |

---

## Recommended Fix: Adopt Slim's Event-Driven Model

The fundamental problem is architectural: GoatCode uses **two independent polling systems** (the manager's poller + the orchestrator's `background_output` calls) that don't communicate. The fix is to replace both with event-driven completion:

### Step 1: Subscribe to session events in the plugin

Route `session.status` events to the `BackgroundAgentManager` from the plugin's `event` hook, similar to how `todo-enforcer`, `stop-guard`, and `loop` already subscribe to `session.idle`.

### Step 2: Add Promise-based completion waiting

Add a `completionResolvers` map to the manager. When a task completes (via event), resolve the Promise. `background_output` awaits the Promise with a real timeout.

### Step 3: Add parent session notification

When a task completes, send the result to the parent session via `session.prompt()` so the orchestrator receives it without polling.

### Step 4: Remove the polling infrastructure

Delete `poller.ts`, the `pollUntilStable` call in `manager.ts`, and the poll budget / timeout cap logic in `output/handler.ts`.

---

## Files Involved

| File | Role |
|------|------|
| `src/tools/background-task/output/handler.ts` | Polling handler with timeout cap and budget |
| `src/features/background-agent/manager.ts` | Task lifecycle, cancellation, abort controllers |
| `src/features/background-agent/poller.ts` | Session stability detection (independent of output handler) |
| `src/features/background-agent/concurrency.ts` | Per-model concurrency limits |
| `src/tools/background-task/cancel/handler.ts` | Cancel handler with `all=true` support |
| `src/hooks/foreground-fallback/handler.ts` | Rate-limit fallback (not directly involved) |

---

## Reproduction Steps

1. Launch 3+ background tasks via `delegate_task` with `run_in_background=true`
2. Each task should take 2-5 minutes (e.g., multi-file codebase exploration)
3. Poll with `background_output` using `block=true, timeout=120000`
4. Observe: timeout is silently capped, tasks show "still running"
5. After 3 polls, observe: budget warning instructs cancellation
6. After one more poll, observe: tasks reported as "cancelled" despite still working
7. Check sessions post-mortem: all work completed successfully, results never consumed
