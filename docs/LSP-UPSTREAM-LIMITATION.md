# LSP Tooling Upstream Limitation in OpenCode Tool Context

## Summary

GoatCode’s LSP wrappers currently depend on OpenCode runtime behavior that is not available in `ToolContext` during tool execution.

Specifically:

- The six LSP tools (`lsp_goto_definition`, `lsp_find_references`, `lsp_symbols`, `lsp_diagnostics`, `lsp_prepare_rename`, `lsp_rename`) attempt to call built-in LSP functionality through `client.tool.call(...)` and/or `client.lsp.*`-style routes.
- At runtime, the tool execution context type does **not** expose `client` at all (per upstream `@opencode-ai/plugin` type definitions).
- GoatCode added a fallback to a stored bootstrap client, which prevents the original missing-client failure, but that fallback client does not expose callable LSP tool methods (`tool.call`) in this execution path.
- Result: errors shift from **missing client** to **missing LSP invocation method**.

This document captures the code path, why delegation works while LSP does not, and what must change upstream.

---

## Affected Tools

### LSP tools (6)

1. `lsp_goto_definition`
2. `lsp_find_references`
3. `lsp_symbols`
4. `lsp_diagnostics`
5. `lsp_prepare_rename`
6. `lsp_rename`

### Related tool

7. `look_at` (uses the same client-resolution mechanism via `getClientFromToolContext`, so it is impacted by context/client exposure behavior, even though it uses `session.*` calls rather than LSP routing)

---

## Observed Error Messages

### Original (before bootstrap fallback is available)

```text
Tool context does not expose OpenCode client
```

Source: `src/tools/lsp/client.ts` throws this when neither `context.client` nor stored fallback client is available.

### Current (after stored client fallback)

```text
LSP client method unavailable: lsp_symbols
```

Source: `src/tools/lsp/client.ts` throws this when all LSP invocation attempts fail:

- direct client method
- `client.lsp.*`
- `client.tool.call(...)`
- `client.tools.call(...)`

---

## Root Cause Analysis (Three Layers)

## 1) OpenCode tool execution context does not expose `client`

Upstream `ToolContext` definition does not include a `client` property.

From `node_modules/@opencode-ai/plugin/dist/tool.d.ts`:

```ts
export type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  directory: string;
  worktree: string;
  abort: AbortSignal;
  metadata(...): void;
  ask(...): Promise<void>;
};
```

No `client` is present in the public tool execution context contract.

## 2) GoatCode fallback supplies a stored bootstrap client

GoatCode initializes and stores client context at bootstrap:

- `src/bootstrap.ts` calls `initLspClientContext(ctx)` before registry setup.

`src/tools/lsp/client.ts`:

- `initLspClientContext(ctx)` stores `ctx.client` in module-level `storedLspClient`.
- `getClientFromToolContext(context)` tries `context.client`; if absent, falls back to `storedLspClient`.

This addresses the missing-context-client error path.

## 3) LSP wrappers require invocation surfaces not available in this path

LSP wrapper dispatcher (`callLspClient`) tries 4 routes in order:

1. direct method on client (e.g., `client.lspSymbols(...)`)
2. method on `client.lsp` (e.g., `client.lsp.lspSymbols(...)` or legacy method name)
3. `client.tool.call({ name, arguments })`
4. `client.tools.call({ name, arguments })`

If none exist, it throws:

```ts
throw new Error(`LSP client method unavailable: ${toolName}`);
```

The upstream SDK type (`node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts`) shows:

- `client.tool` exists as a `Tool` class with `ids(...)` and `list(...)`
- no `tool.call(...)` method in this type definition
- `client.lsp` exists with `status(...)` only

So the LSP wrapper cannot dispatch built-in LSP tool calls via the currently exposed SDK surface.

---

## Code Walkthrough

## A) LSP handler calls shared client adapter

Example: `src/tools/lsp/goto-definition/handler.ts`

```ts
const client = getClientFromToolContext(ctx);
const result = await callLspClient(client, TOOL_NAME, "lspGotoDefinition", parsedArgs);
```

All six LSP handlers follow this same pattern.

## B) Shared adapter attempts fallback dispatch chain

`src/tools/lsp/client.ts` (`callLspClient`):

```ts
const directResult = await callMethod(clientRecord, directMethodName, args);
...
const lspResult = await callMethod(lspHost, directMethodName, args);
...
const toolResult = await callToolExecutor(clientRecord.tool, toolName, args);
...
const toolsResult = await callToolExecutor(clientRecord.tools, toolName, args);
...
throw new Error(`LSP client method unavailable: ${toolName}`);
```

And `callToolExecutor` only works if `caller.call` exists:

```ts
type ToolCaller = {
  call?: (input: { name: string; arguments: JsonRecord }) => Promise<unknown>;
};
...
if (!caller.call) return undefined;
```

## C) Client acquisition path and fallback

`getClientFromToolContext(...)` in the same file:

```ts
if (contextRecord) {
  const client = contextRecord.client;
  if (client) return client as OpenCodeContext["client"];
}

if (storedLspClient) return storedLspClient;

throw new Error("Tool context does not expose OpenCode client");
```

## D) Bootstrap stores the client intentionally

`src/bootstrap.ts`:

```ts
// ... tools can access the client even when the tool execution context doesn't expose it directly.
initSessionManagerContext(ctx);
initLspClientContext(ctx);
```

## E) Delegation tool confirms same context issue and workaround

`src/tools/delegate-task/handler.ts` (`resolveClient`, lines 28–53):

- tries `getClientFromToolContext(toolContext)` first
- falls back to stored plugin context
- error if neither available

Its comment explicitly states OpenCode runtime does not always expose `client` in tool context.

## F) Existing acknowledgment in built-in tools

`src/tools/builtin-tools.ts` lines 7–9:

```ts
// skill_mcp is intentionally excluded — it requires ctx.client MCP integration
// that is not yet available in the tool execute context. Re-enable once implemented.
```

This is the same class of upstream limitation.

---

## What Works vs What Does Not

## Works

- Delegation flow using `client.session.*` methods.
  - Example from `src/tools/delegate-task/handler.ts`: delegated execution builds deps with resolved `client` and succeeds because `session` APIs are present on SDK client.
- `look_at` execution path that relies on `client.session.create`, `client.session.promptAsync`, `client.session.messages`, `client.session.status` (assuming client resolution succeeds).

## Does not work (for LSP wrappers)

- Any path requiring `client.tool.call(...)` to invoke a built-in tool by name.
- Any path expecting richer `client.lsp.*` operations beyond `lsp.status(...)`.

From upstream SDK typings (`sdk.gen.d.ts`):

- `tool`: has `ids(...)`, `list(...)` only
- `lsp`: has `status(...)` only

No typed runtime API exists there for `tool.call` or `lsp_goto_definition`-style methods.

---

## Reproducible Examples

These examples are intended for reproducing behavior in a GoatCode/OpenCode runtime where tool execution context does not carry a callable tool invoker.

## Repro A: Original failure mode (no client context and no fallback)

1. Ensure `initLspClientContext(ctx)` is not called (or stored context is reset).
2. Invoke:

```json
{
  "tool": "lsp_goto_definition",
  "arguments": {
    "filePath": "src/index.ts",
    "line": 1,
    "character": 1
  }
}
```

Expected tool output contains:

```text
Error: Tool context does not expose OpenCode client
```

## Repro B: Current failure mode (fallback client present, but no LSP call surface)

1. Ensure bootstrap fallback is active (`initLspClientContext(ctx)` is called).
2. Invoke:

```json
{
  "tool": "lsp_symbols",
  "arguments": {
    "filePath": "src/index.ts",
    "scope": "document",
    "limit": 10
  }
}
```

Expected tool output contains:

```text
Error: LSP client method unavailable: lsp_symbols
```

Equivalent behavior applies to the other 5 LSP tools.

---

## What GoatCode Already Does

1. **Stored client fallback for tool execution**
   - `initLspClientContext(ctx)` stores bootstrap client.
   - `getClientFromToolContext` uses tool context first, then stored client.

2. **Shared multi-path LSP dispatch adapter**
   - Attempts direct methods, `client.lsp`, `client.tool.call`, `client.tools.call`.
   - Produces explicit diagnostic when unavailable.

3. **Acknowledged upstream limitation pattern in other tooling**
   - `skill_mcp` intentionally excluded pending `ctx.client`/integration support in execute context (`src/tools/builtin-tools.ts`).

---

## What OpenCode Needs to Change (Upstream)

To make GoatCode LSP wrappers reliable, OpenCode should expose one of the following in tool execution runtime/context:

1. **Preferred:** `context.client` in `ToolContext` with a callable tool execution API:
   - `client.tool.call({ name, arguments })`
   - or equivalent stable method for invoking built-in tools by tool name

2. **Alternative:** Rich LSP client methods directly:
   - e.g. `client.lsp.gotoDefinition(...)`, `client.lsp.findReferences(...)`, etc.

3. **Type + runtime alignment:**
   - Ensure `@opencode-ai/plugin` `ToolContext` type and runtime payload match.
   - Ensure `@opencode-ai/sdk` typings include whichever invocation method is officially supported.

Without a callable invocation surface, third-party tool wrappers cannot bridge to built-in LSP functionality.

---

## Workaround Options

Until upstream support lands, possible options are:

1. **Direct TypeScript LSP process (standalone) in GoatCode**
   - Run language server protocol requests directly (e.g., via `typescript-language-server` or `tsserver` protocol bridge).
   - Pros: full control, unblocks LSP features.
   - Cons: significant implementation/maintenance overhead, language-by-language complexity.

2. **Use non-LSP fallback tools where possible**
   - `grep`, `glob`, `ast_grep_search`, `lsp`-adjacent heuristics for discovery-like tasks.
   - Pros: immediately available.
   - Cons: not semantic-equivalent to true LSP definitions/references/rename safety.

3. **Leverage existing SDK surfaces (`find.symbols`, etc.) for partial capability**
   - The SDK exposes `client.find.symbols(...)` and other search primitives.
   - Pros: official API available today.
   - Cons: not a substitute for full LSP operations like prepare-rename or exact definition jumps.

4. **Feature-gate LSP tools with explicit runtime capability checks**
   - Detect missing `tool.call` / unsupported `lsp` methods and return a clear, upstream-pointing message.
   - Pros: better UX, fewer confusing failures.
   - Cons: does not restore functionality.

---

## Notes for Upstream Issue Filing

When filing with OpenCode, include:

- Current `ToolContext` typing from `@opencode-ai/plugin` (`tool.d.ts`) showing no `client`.
- SDK typing from `@opencode-ai/sdk` (`sdk.gen.d.ts`) showing:
  - `tool` has `ids/list`, no `call`
  - `lsp` has `status` only
- GoatCode fallback code proving client is captured at bootstrap but still cannot invoke LSP tool methods.
- Error progression:
  - old: `Tool context does not expose OpenCode client`
  - current: `LSP client method unavailable: <tool_name>`

This frames the issue as a runtime/type contract gap rather than a GoatCode-specific bug.
