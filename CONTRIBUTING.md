# Contributing to OcHead

We appreciate your interest in contributing to OcHead. This guide covers the development setup, architecture, and contribution process.

## Development Setup

OcHead is built with Bun. Ensure you have Bun installed before starting.

1. Clone the repository.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run tests to verify your setup:
   ```bash
   bun test
   ```
4. Run type checking:
   ```bash
   bun run typecheck
   ```

## Architecture Overview

OcHead follows a micro-plugin architecture. The project was built in waves:

1. **Foundation**: Project scaffolding, core types, and the plugin registry.
2. **Core Systems**: Agent, tool, and hook systems, background manager, and session state.
3. **Agents**: Implementation of the 11 specialized agents.
4. **Tools**: Implementation of the 26 built-in tools.
5. **Hooks**: Implementation of the 30 lifecycle hooks.
6. **Features**: Category system, skill system, and slash commands.
7. **CLI & Integration**: CLI framework and final plugin integration.
8. **Documentation**: Comprehensive guides and API references.

## Adding a New Plugin

Every feature in OcHead is a plugin. Use the `definePlugin` helper to create new contributions.

### Adding a Tool Plugin

1. Create a new directory in `src/tools/`.
2. Define your tool using `definePlugin`:
   ```typescript
   import { definePlugin } from "../../plugin-api"

   export const myToolPlugin = definePlugin({
     name: "my-tool",
     tools: {
       my_tool: {
         description: "Does something useful",
         parameters: {
           type: "object",
           properties: {
             input: { type: "string" }
           }
         },
         execute: async ({ input }) => {
           return `Processed: ${input}`
         }
       }
     }
   })
   ```
3. Register the plugin in the appropriate registry or configuration.

### Adding a Hook Plugin

1. Create a new directory in `src/hooks/`.
2. Define your hook using `definePlugin`:
   ```typescript
   import { definePlugin } from "../../plugin-api"

   export const myHookPlugin = definePlugin({
     name: "my-hook",
     hooks: {
       "tool.execute.before": async (params) => {
         console.log("Executing tool:", params.tool)
       }
     }
   })
   ```

## Testing Conventions

We use `bun:test` for all tests. Follow the given/when/then style with nested describe blocks.

```typescript
import { describe, it, expect } from "bun:test"

describe("MyComponent", () => {
  describe("#myMethod", () => {
    describe("given valid input", () => {
      it("should return the expected result", () => {
        // test logic
      })
    })
  })
})
```

Tests should be co-located with the source files they test (e.g., `my-file.test.ts` next to `my-file.ts`).

## PR Process

1. Create a new branch for your changes.
2. Ensure all tests pass and type checking succeeds.
3. Write clear commit messages that explain the "why" behind the changes.
4. Submit a pull request with a detailed description of your changes.
5. All PRs require a review before merging.
