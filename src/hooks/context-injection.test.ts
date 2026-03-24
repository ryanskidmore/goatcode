import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createAgentsInjectorHandler } from "./agents-injector"
import { createReadmeInjectorHandler } from "./readme-injector"
import { createRulesInjectorHandler } from "./rules-injector"
import {
  createCompactionContextEventHandler,
  createCompactionContextSystemTransformHandler,
} from "./compaction-context"

const tempDirectories: string[] = []

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "goatcode-hooks-"))
  tempDirectories.push(workspace)
  return workspace
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("context injection hooks", () => {
  describe("#given a Read tool output in nested directories", () => {
    describe("#when agents-injector runs", () => {
      it("#then it appends AGENTS.md context from parent directories", async () => {
        const workspace = createWorkspace()
        const nested = join(workspace, "src", "feature")
        const targetFile = join(nested, "handler.ts")
        mkdirSync(nested, { recursive: true })

        writeFileSync(join(workspace, "AGENTS.md"), "root-agent-rules")
        writeFileSync(join(workspace, "src", "AGENTS.md"), "src-agent-rules")
        writeFileSync(targetFile, "export {}")

        const handler = createAgentsInjectorHandler(workspace)
        const output = {
          title: targetFile,
          output: "file-content",
        }

        await handler({ tool: "Read" }, output)

        expect(output.output).toContain("root-agent-rules")
        expect(output.output).toContain("src-agent-rules")
      })
    })
  })

  describe("#given a Read tool output with a sibling README", () => {
    describe("#when readme-injector runs", () => {
      it("#then it appends README.md content", async () => {
        const workspace = createWorkspace()
        const docsDir = join(workspace, "docs")
        mkdirSync(docsDir, { recursive: true })
        writeFileSync(join(docsDir, "README.md"), "docs-readme")
        writeFileSync(join(docsDir, "guide.md"), "guide")

        const handler = createReadmeInjectorHandler(workspace)
        const output = {
          title: join(docsDir, "guide.md"),
          output: "guide-content",
        }

        await handler({ tool: "read" }, output)

        expect(output.output).toContain("docs-readme")
      })
    })
  })

  describe("#given workspace rule files", () => {
    describe("#when rules-injector runs", () => {
      it("#then it appends .rules and RULES.md to system text", async () => {
        const workspace = createWorkspace()
        writeFileSync(join(workspace, ".rules"), "dot-rules")
        writeFileSync(join(workspace, "RULES.md"), "markdown-rules")

        const handler = createRulesInjectorHandler(workspace)
        const output = { system: "base-system" }

        await handler({}, output)

        expect(output.system).toContain("dot-rules")
        expect(output.system).toContain("markdown-rules")
      })
    })
  })

  describe("#given compaction with todo and plan files", () => {
    describe("#when compaction-context processes event then system transform", () => {
      it("#then it injects preserved context for the compacted session", async () => {
        const workspace = createWorkspace()
        const plansDir = join(workspace, ".sisyphus", "plans")
        mkdirSync(plansDir, { recursive: true })
        writeFileSync(join(workspace, ".sisyphus", "todos.md"), "- [ ] do thing")
        writeFileSync(join(plansDir, "active.md"), "# Active Plan")

        const snapshots = new Map<string, string>()
        const eventHandler = createCompactionContextEventHandler(workspace, snapshots)
        const transformHandler = createCompactionContextSystemTransformHandler(snapshots)

        await eventHandler({
          event: {
            type: "session.compacted",
            properties: { sessionID: "session-1" },
          },
        })

        const output = { system: "base-system" }
        await transformHandler({ sessionID: "session-1" }, output)

        expect(output.system).toContain("Current Todos")
        expect(output.system).toContain("Active Plan")
      })
    })
  })
})
