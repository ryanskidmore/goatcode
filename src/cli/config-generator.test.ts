import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { generateConfig } from "./config-generator"

const PROJECT_ROOT = resolve(__dirname, "../..")

describe("#given generateConfig with default options", () => {
  describe("#when called with no arguments", () => {
    it("#then the output contains the defineConfig import", () => {
      const result = generateConfig()
      expect(result).toContain('import { defineConfig } from "ochead"')
    })

    it("#then the output contains the defineConfig call", () => {
      const result = generateConfig()
      expect(result).toContain("export default defineConfig({")
    })

    it("#then the output contains agent override comments", () => {
      const result = generateConfig()
      expect(result).toContain("// agents: {")
    })

    it("#then the output contains all built-in agent names in comments", () => {
      const result = generateConfig()
      expect(result).toContain('"orchestrator"')
      expect(result).toContain('"deep-worker"')
      expect(result).toContain('"plan-builder"')
      expect(result).toContain('"advisor"')
      expect(result).toContain('"researcher"')
      expect(result).toContain('"explorer"')
      expect(result).toContain('"executor"')
      expect(result).toContain('"analyst"')
      expect(result).toContain('"reviewer"')
      expect(result).toContain('"inspector"')
      expect(result).toContain('"worker"')
    })

    it("#then the output contains category override comments", () => {
      const result = generateConfig()
      expect(result).toContain("// categories: {")
    })

    it("#then the output contains all built-in category names in comments", () => {
      const result = generateConfig()
      expect(result).toContain('//   "visual-engineering":')
      expect(result).toContain('//   "ultrabrain":')
      expect(result).toContain('//   "deep":')
      expect(result).toContain('//   "artistry":')
      expect(result).toContain('//   "quick":')
      expect(result).toContain('//   "unspecified-low":')
      expect(result).toContain('//   "unspecified-high":')
      expect(result).toContain('//   "writing":')
    })

    it("#then the output contains the plugins array", () => {
      const result = generateConfig()
      expect(result).toContain("plugins: [")
    })

    it("#then the output lists all built-in micro-plugins", () => {
      const result = generateConfig()
      expect(result).toContain('"ochead/orchestrator"')
      expect(result).toContain('"ochead/deep-worker"')
      expect(result).toContain('"ochead/plan-builder"')
      expect(result).toContain('"ochead/advisor"')
      expect(result).toContain('"ochead/researcher"')
      expect(result).toContain('"ochead/explorer"')
      expect(result).toContain('"ochead/executor"')
      expect(result).toContain('"ochead/analyst"')
      expect(result).toContain('"ochead/reviewer"')
      expect(result).toContain('"ochead/inspector"')
      expect(result).toContain('"ochead/worker"')
    })

    it("#then the output ends with a newline", () => {
      const result = generateConfig()
      expect(result.endsWith("\n")).toBe(true)
    })
  })
})

describe("#given generateConfig with includePlugins: false", () => {
  describe("#when called with includePlugins disabled", () => {
    it("#then the output does not contain the plugins array", () => {
      const result = generateConfig({ includePlugins: false })
      expect(result).not.toContain("plugins: [")
    })

    it("#then the output still contains the defineConfig import", () => {
      const result = generateConfig({ includePlugins: false })
      expect(result).toContain('import { defineConfig } from "ochead"')
    })
  })
})

describe("#given generateConfig with includeAgents: false", () => {
  describe("#when called with includeAgents disabled", () => {
    it("#then the output does not contain agent override comments", () => {
      const result = generateConfig({ includeAgents: false })
      expect(result).not.toContain("// agents: {")
    })

    it("#then the output still contains category override comments", () => {
      const result = generateConfig({ includeAgents: false })
      expect(result).toContain("// categories: {")
    })
  })
})

describe("#given generateConfig with includeCategories: false", () => {
  describe("#when called with includeCategories disabled", () => {
    it("#then the output does not contain category override comments", () => {
      const result = generateConfig({ includeCategories: false })
      expect(result).not.toContain("// categories: {")
    })

    it("#then the output still contains agent override comments", () => {
      const result = generateConfig({ includeCategories: false })
      expect(result).toContain("// agents: {")
    })
  })
})

describe("#given the generated config written to a temp file", () => {
  let tempDir: string
  let tempFile: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ochead-config-test-"))
    tempFile = join(tempDir, "ochead.config.ts")
    const content = generateConfig()
    writeFileSync(tempFile, content, "utf8")
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("#when typechecked with tsc", () => {
    it("#then the generated config is valid TypeScript", () => {
      const result = spawnSync(
        "bunx",
        ["tsc", "--noEmit"],
        { encoding: "utf8", cwd: PROJECT_ROOT }
      )
      expect(result.status).toBe(0)
    })
  })
})
