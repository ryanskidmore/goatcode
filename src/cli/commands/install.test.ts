import { describe, it, expect } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { BUILTIN_AGENT_PLUGINS } from "../../agents/builtin-agents"
import { installCommand } from "./install"

describe("#given the install command", () => {
  describe("#when run with --non-interactive", () => {
    it("#then it generates goatcode.config.ts with defineConfig", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "goatcode-install-test-"))

      try {
        const configPath = await installCommand({ nonInteractive: true, cwd: tempDir })
        const content = readFileSync(configPath, "utf8")

        expect(configPath).toBe(join(tempDir, "goatcode.config.ts"))
        expect(content).toContain('import { defineConfig } from "goatcode"')
        expect(content).toContain("export default defineConfig({")
      } finally {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it("#then generated config lists all built-in plugins", async () => {
      const tempDir = mkdtempSync(join(tmpdir(), "goatcode-install-test-"))

      try {
        const configPath = await installCommand({ nonInteractive: true, cwd: tempDir })
        const content = readFileSync(configPath, "utf8")

        for (const plugin of BUILTIN_AGENT_PLUGINS) {
          expect(content).toContain(`"${plugin.name}"`)
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })
})
