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

1. Start from a root orchestrator conversation (depth 0).
2. Delegate once to any specialist, which injects `<!-- goatcode:delegation_depth=1 -->` into the child prompt.
3. From that specialist session, delegate again to another specialist. The next child runs at depth 2 (`<!-- goatcode:delegation_depth=2 -->`).
4. From the depth-2 session, invoke `task` with any category/subagent.
5. Observe immediate rejection with the error above.

## Impact

- Prevents nested sub-delegation from a depth-2 context.
- Can stall execution if caller logic retries delegation instead of switching to direct execution.

## Suggested improvement

- Return structured error metadata (`code: DEPTH_LIMIT_REACHED`) in addition to text.
- Include explicit recommended fallback (`execute_directly: true`) for easier automation.

## Workarounds and best practices

- If already at depth 2, stop delegating and execute directly with available tools.
- Keep decomposition flatter: split work at depth 0/1 into parallel sibling delegations rather than nesting deeper.
- For long tasks started at depth 1, continue the same specialist session (`session_id`) instead of spawning a new sub-delegation.
- Surface current depth in task logs/UI to avoid repeated blocked retries.

## Example structured error payload

```json
{
  "error": {
    "code": "DEPTH_LIMIT_REACHED",
    "message": "Delegation blocked: maximum depth (2) reached. Current depth: 2.",
    "currentDepth": 2,
    "maxDepth": 2,
    "recommendedAction": "execute_directly",
    "retryable": false
  }
}
```
