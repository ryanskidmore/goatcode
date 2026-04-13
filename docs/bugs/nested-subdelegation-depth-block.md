# Nested sub-delegation blocked at depth 2

## Summary

When running as a delegated sub-agent at depth 2, attempting another `task` delegation fails immediately with depth enforcement.

This is expected by policy, but the failure mode needs clearer surfaced guidance to prevent wasted retries.

## Evidence

Observed tool output during this session:

```text
Delegation blocked: maximum depth (2) reached. Current depth: 2. Execute the work directly using your available tools instead of delegating.
```

## Reproduction

1. Start in a conversation where current agent depth is 2 (`<!-- goatcode:delegation_depth=2 -->`).
2. Invoke `task` with any category/subagent.
3. Observe immediate rejection with the error above.

## Impact

- Prevents nested sub-delegation from a depth-2 context.
- Can stall execution if caller logic retries delegation instead of switching to direct execution.

## Suggested improvement

- Return structured error metadata (`code: DEPTH_LIMIT_REACHED`) in addition to text.
- Include explicit recommended fallback (`execute_directly: true`) for easier automation.
