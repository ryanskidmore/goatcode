# Bug Investigation: Concurrency Starvation & Global Cancel Cascade

## Summary

When the orchestrator launches multiple background explorer tasks that themselves attempt to sub-delegate, a concurrency starvation deadlock occurs. Parent tasks hold concurrency slots while their child sub-tasks queue behind the same pool. Eventually, a frustrated sub-agent calls `background_cancel all=true`, which cancels ALL tasks globally — including sibling parent tasks — creating a cascade failure.

This is a distinct but related bug to the [Background Task Polling Bug](./BACKGROUND-TASK-POLLING-BUG.md). The polling bug was about detection/notification; this bug is about resource management and isolation. The event-driven fix from PR #45 solved the detection problem, but the underlying concurrency and cancellation scope issues remain.

---

## Incident Timeline

### Context

The orchestrator was asked to produce comprehensive test scenarios for the entire GoatCode codebase. It launched 4 parallel background explorer tasks:

| Task | Purpose | Task ID | Session ID |
|------|---------|---------|------------|
| 1 | Test audit (find all test files) | `task_1775895483230_guj8bq` | `ses_284616c9cffeV0MBo8wb486JJN` |
| 2 | Tools exploration (23 tools) | `task_1775895492965_5zsqq5` | `ses_284614697ffeM1b6i45kmLC6NH` |
| 3 | Hooks exploration (32 hooks) | `task_1775895503804_hyi623` | `ses_284611c40ffe7UQEZP950laBn3` |
| 4 | Features/config exploration | `task_1775895515810_15qgd6` | `ses_2845e10b0ffes04ZvivZWpCrxj` |

All 4 used category `deep` → model `gpt-5.3-codex` → ConcurrencyManager key `gpt-5.3-codex`.

### Phase 1: Launch (T+0s)

All 4 tasks acquired concurrency slots successfully (4 of 5 available slots for `gpt-5.3-codex`).

### Phase 2: Sub-Delegation Explosion (T+~30s)

The depth-1 explorer agents, facing large scope, immediately tried to sub-delegate:

| Parent Task | Sub-Tasks Launched | Sub-Task Depth |
|-------------|-------------------|----------------|
| Task 1 (test audit) | **0** — did work directly | N/A |
| Task 2 (tools) | **4** parallel sub-explorers | depth=2 |
| Task 3 (hooks) | **8** parallel sub-explorers | depth=2 |
| Task 4 (features) | **5** parallel sub-explorers | depth=2 |
| **Total** | **17 sub-tasks** | |

### Phase 3: Concurrency Starvation (T+~30s onward)

The concurrency pool state:
```
Model: gpt-5.3-codex
Limit: 5
Held by parents: 4 slots (tasks 1-4)
Available: 1 slot
Queued sub-tasks: 16 (1 running, 16 waiting)
```

Only 1 sub-task could execute at a time. With each sub-task taking ~15-30s, the queue would take **4-8 minutes** to drain — but the parent tasks need their children to complete before they can complete themselves, and they continue holding their slots the entire time.

**This is a classic resource starvation pattern**: parents hold resources that children need, but parents can't release resources until children complete.

### Phase 4: Agent Frustration & Recovery Attempts (T+~60s)

The depth-1 agents observed their sub-tasks stuck in queue:

- **Task 3** (hooks): *"The background agents are queued but not yet executing. Let me switch approach and do the exploration directly."*
- **Task 4** (features): *"Tasks are still queued. Let me wait for them to start and complete..."* → later: *"Background tasks were cancelled (likely resource constraints). Switching to direct exploration."*

### Phase 5: Global Cancel Cascade (T+~60-90s)

One or more depth-1 agents called `background_cancel all=true` to clean up their stuck sub-tasks. The cancel handler has **global scope**:

```typescript
// src/tools/background-task/cancel/handler.ts
if (cancelAll) {
    const tasks = manager.getAll();
    const cancellable = tasks.filter(t => t.status === "queued" || t.status === "running");
    for (const task of cancellable) {
        await manager.cancel(ctx, task.id);
    }
}
```

This cancelled **ALL** running/queued tasks in the `BackgroundAgentManager` singleton — not just the caller's children, but also:
- Other parent tasks (sibling depth-1 agents)
- Other parents' sub-tasks
- Any unrelated background tasks

### Phase 6: Orchestrator Observes Failure (T+~120-200s)

The orchestrator's `background_output` calls returned:
- Task 1: ✅ `completed` (finished before cascade)
- Task 2: ❌ `cancelled`
- Task 3: ❌ `cancelled`
- Task 4: ❌ `cancelled`

### Phase 7: User Observation

The user observed: *"After a certain point it's like we couldn't spawn any more. The sessions just sat there doing nothing (and we couldn't even click them!)"*

The "can't click" behavior matches the metadata emission flow: when sub-tasks are queued behind concurrency, `spawnBackgroundSession()` hasn't been called yet, so no `sessionId` exists. The TUI card shows but is non-interactive because the second metadata emission (with `sessionId`) never fires.

---

## Root Cause Analysis

### Bug 1: Concurrency Self-Deadlock (Critical)

**File**: `src/features/background-agent/concurrency.ts`

The `ConcurrencyManager` uses a single flat pool per model key. When parent tasks hold slots and their children need the same pool, starvation occurs:

```
Parent tasks: hold N slots while waiting for children
Children: need slots from the same pool
Available = limit - N
If N >= limit: complete deadlock
If N ≈ limit: severe starvation (our case: 4/5 held → 1 available for 17 sub-tasks)
```

The concurrency manager has no concept of task hierarchy. It doesn't know that freeing a parent's slot would unblock its children (which would then let the parent complete).

**Severity**: Critical when agents sub-delegate. The default limit (5) combined with a typical fan-out of 4+ parent tasks makes starvation almost guaranteed.

### Bug 2: Global Cancel Scope (Critical)

**File**: `src/tools/background-task/cancel/handler.ts`

The `background_cancel all=true` tool cancels ALL tasks in the manager, regardless of who spawned them. Any agent at any depth can nuke the entire background task system.

The tool description even encourages this: *"Use all=true to cancel ALL before final answer."*

When a depth-1 agent decides its sub-tasks are stuck and calls `all=true`, it cancels:
- Its own sub-tasks (intended)
- Sibling parent tasks (unintended)
- Other parents' sub-tasks (unintended)
- Any unrelated background tasks (unintended)

**Severity**: Critical. A single frustrated sub-agent can cascade-cancel the entire system.

### Bug 3: Aggressive Sub-Delegation at Depth-1 (Design Issue)

The depth-1 explorer agents, given a large scope, immediately tried to sub-delegate rather than doing the work directly. This is their trained behavior (the orchestrator's system prompt encourages delegation-first). But at depth-1 with limited concurrency, sub-delegation creates explosive fan-out:

```
Orchestrator (depth=0) → 4 explorers (depth=1) → 17 sub-tasks (depth=2)
Total background sessions: 4 + 17 = 21
Concurrency slots available: 5
```

The depth limit (`MAX_DELEGATION_DEPTH = 2`) prevents depth-2 agents from delegating further, but doesn't prevent depth-1 agents from creating unsustainable fan-out.

**Severity**: Medium. The delegation is technically valid but practically counterproductive. Agents need awareness of concurrency constraints.

### Bug 4: Non-Interactive Queued Task UI (UX Issue)

**Files**: `src/tools/delegate-task/executor.ts`

The metadata emission flow:
1. First emission: task description + category (no `sessionId`) — card appears
2. `manager.launch()` → `startTask()` → `concurrency.acquire()` → **BLOCKS for queued tasks**
3. `waitForSessionId()` → polls for 5s → times out if still queued
4. Second emission: with `sessionId` → card becomes clickable

For queued tasks, the session is never created, so the card is permanently non-interactive. The user sees ghost tasks they can't inspect.

**Severity**: Medium. Poor UX but not functionally broken.

### Bug 5: Incorrect Model/Agent Display in TUI (UX Issue)

**Files**: `src/features/background-agent/spawner.ts`, `src/plugin/compositor.ts`

All background sessions display as "Orchestrator / claude-opus-4-6" in the TUI, regardless of what model was actually used for inference. This happens because:

1. `spawner.ts` creates sessions with **no model field** in `session.create()`:
   ```typescript
   const createResult = await ctx.client.session.create({
       body: { title, parentID },  // no model field
       query: { directory },
   });
   ```
2. The model is only specified in the subsequent `promptAsync()` call, which tells OpenCode what model to USE but doesn't change the session's DISPLAY model
3. The compositor sets `default_agent: "orchestrator"` → all new sessions inherit this label and the orchestrator's model in the TUI

**Impact**: User sees 4+ sessions all labeled "Orchestrator / Opus 4.6" when they're actually running different models on different categories. Combined with the non-interactive card issue, the user has no way to distinguish or inspect background sessions.

**Fix options**:
- Include actual model in metadata (`metadata.displayModel = config.model`)
- Set a descriptive session title that includes the model/category: `"[deep] gpt-5.3-codex: Explore hooks"`
- If OpenCode API supports model on `session.create()`, pass it there

**Severity**: Low. The actual inference uses the correct model; this is purely a display issue.

---

## Connection to Prior Bugs

This bug shares the same `BackgroundAgentManager` singleton as the [Polling Bug](./BACKGROUND-TASK-POLLING-BUG.md), and several root causes overlap:

| Aspect | Polling Bug (PR #45) | Concurrency Bug (this) |
|--------|---------------------|----------------------|
| **Primary failure** | Orchestrator couldn't detect completion | Sub-tasks can't acquire concurrency slots |
| **Secondary failure** | Silent timeout capping | Global cancel cascade |
| **Fix applied** | Event-driven completion detection | *Not yet fixed* |
| **Shared root cause** | No task hierarchy awareness | No task hierarchy awareness |
| **Shared component** | `BackgroundAgentManager` singleton | `BackgroundAgentManager` singleton |

The polling bug's "mysterious task cancellation" (Bug 3 in that report) was likely the same global cancel cascade described here. The prior report hypothesized *"Cascading cancellation via the shared BackgroundAgentManager"* — this incident confirms it.

The prior report's **Fix 4: Isolate Cancellation Scope** directly addresses Bug 2 here. That fix was deprioritized in PR #45 in favor of event-driven completion, but is now confirmed as a critical requirement.

---

## Proposed Fixes

### Fix 1: Scoped Cancellation (Critical — Must Fix)

`background_cancel all=true` must scope cancellation by delegation depth:

- **Root orchestrator (depth=0)**: `all=true` cancels ALL tasks globally — this is the only agent that should have full cancel authority
- **Any other agent (depth≥1)**: `all=true` cancels only tasks whose `parentSessionID` matches the caller's session

```typescript
// In background_cancel handler:
if (cancelAll) {
    const callerSessionID = resolveParentSessionID(toolContext);
    const callerDepth = await extractDelegationDepth(client, callerSessionID);
    
    let cancellable: BackgroundTask[];
    if (callerDepth === 0 || callerDepth === null) {
        // Root orchestrator: full global cancel authority
        cancellable = manager.getAll().filter(
            t => t.status === "queued" || t.status === "running"
        );
    } else {
        // Sub-agent: can only cancel its own children
        cancellable = manager.getAll().filter(
            t => (t.status === "queued" || t.status === "running") &&
                 t.parentSessionID === callerSessionID
        );
    }
    // ...cancel only these tasks
}
```

**Prerequisite**: The `BackgroundTask` type already has `parentSessionID` (set in `executor.ts` via `LaunchInput`). The cancel handler just needs to filter by it and check caller depth.

### Fix 2: Hierarchical Concurrency (Critical — Must Fix)

Two options:

**Option A: Separate pools for delegation depths**
```typescript
// Key includes depth: "gpt-5.3-codex:depth-1" vs "gpt-5.3-codex:depth-2"
const concurrencyKey = `${model}:depth-${delegationDepth}`;
await concurrency.acquire(concurrencyKey);
```

**Option B: Reserve slots for sub-tasks**
```typescript
// Reserve N slots out of the limit for sub-tasks
const PARENT_LIMIT = 3; // Max parent tasks per model
const CHILD_LIMIT = 2;  // Reserved for children
// Parents acquire from parent pool; children acquire from child pool
```

**Option C: Parent yields slot while waiting for children (most elegant)**
```typescript
// When a parent task's agent starts sub-delegating, release the parent's
// concurrency slot temporarily. Re-acquire when children complete.
// Requires tracking parent-child relationships.
```

**Recommended**: Option A is simplest and avoids the starvation entirely. Each depth level gets its own 5-slot pool.

### Fix 3: Concurrency-Aware Delegation Guidance (Medium Priority)

Inject concurrency awareness into depth-1 agent prompts:

```typescript
function buildPromptWithConcurrencyContext(prompt: string, depth: number): string {
    if (depth >= 1) {
        return prompt + "\n\nIMPORTANT: Background task concurrency is limited. " +
            "Prefer doing work directly rather than sub-delegating to many background tasks. " +
            "Only sub-delegate if the work is truly parallelizable and you have 3 or fewer sub-tasks.";
    }
    return prompt;
}
```

### Fix 4: Queued Task UI State (Low Priority)

Show queued tasks with a distinct UI state:
```typescript
// In metadata emission:
if (task.status === "queued") {
    metadata.status = "queued";
    metadata.queuePosition = concurrency.getQueueLength(model);
}
```

### Fix 5: Fan-Out Limit (Low Priority)

Add a per-parent limit on sub-task creation, but free up the children once other tasks complete.

```typescript
const MAX_CHILDREN_PER_PARENT = 4;

// In executeBackground:
const existingChildren = manager.getAll().filter(
    t => t.parentSessionID === deps.sessionID
);
if (existingChildren.length >= MAX_CHILDREN_PER_PARENT) {
    return "Cannot launch more background tasks: limit reached. Execute directly instead.";
}
```

---

## Priority Matrix

| Fix | Severity | Effort | Priority |
|-----|----------|--------|----------|
| Fix 1: Scoped cancellation | Critical | Low (filter by parentSessionID) | **P0** |
| Fix 2: Hierarchical concurrency | Critical | Medium (new concurrency key scheme) | **P0** |
| Fix 3: Delegation guidance | Medium | Low (prompt injection) | **P1** |
| Fix 5: Fan-out limit | Medium | Low (count check) | **P1** |
| Fix 4: Queued task UI | Low | Medium (metadata flow) | **P2** |

---

## Reproduction Steps

1. Launch 4+ background tasks on the same model via `delegate_task` with `run_in_background=true`
2. Each task should be scoped broadly enough that the depth-1 agent attempts to sub-delegate
3. Observe: sub-tasks queue behind concurrency limit
4. Observe: depth-1 agents report sub-tasks as "queued but not executing"
5. Observe: one agent calls `background_cancel all=true`
6. Observe: ALL tasks (including siblings) are cancelled
7. Observe: orchestrator sees 3/4 tasks as `cancelled`

## Files Involved

| File | Role |
|------|------|
| `src/features/background-agent/concurrency.ts` | Per-model concurrency limiting (flat pool, no hierarchy) |
| `src/features/background-agent/manager.ts` | Task lifecycle, slot acquisition/release |
| `src/tools/background-task/cancel/handler.ts` | Global cancel scope via `all=true` |
| `src/tools/delegate-task/executor.ts` | Sub-task creation, metadata emission, session waiting |
| `src/tools/delegate-task/constants.ts` | `MAX_DELEGATION_DEPTH = 2` |
| `src/tools/delegate-task/handler.ts` | Depth enforcement, category routing |
