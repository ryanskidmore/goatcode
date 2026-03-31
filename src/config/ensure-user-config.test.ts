import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureUserConfig } from "./ensure-user-config";

describe("#given ensureUserConfig", () => {
  let originalEnv: string | undefined;
  let tempDir: string;

  beforeEach(() => {
    originalEnv = process.env.GOATCODE_CONFIG_DIR;
    tempDir = mkdtempSync(join(tmpdir(), "goatcode-user-config-test-"));
    process.env.GOATCODE_CONFIG_DIR = tempDir;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GOATCODE_CONFIG_DIR = originalEnv;
    } else {
      delete process.env.GOATCODE_CONFIG_DIR;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("#when config directory exists but config file does not", () => {
    it("#then it creates the default config file", async () => {
      const configPath = join(tempDir, "config.ts");
      expect(existsSync(configPath)).toBe(false);

      await ensureUserConfig();

      expect(existsSync(configPath)).toBe(true);
      const content = readFileSync(configPath, "utf8");
      expect(content).toContain('import { defineConfig } from "goatcode-sh"');
      expect(content).toContain("export default defineConfig({");
    });
  });

  describe("#when config file already exists", () => {
    it("#then it does not overwrite the existing file", async () => {
      const configPath = join(tempDir, "config.ts");
      const existingContent = "// existing user config\n";
      writeFileSync(configPath, existingContent, "utf8");

      await ensureUserConfig();

      const content = readFileSync(configPath, "utf8");
      expect(content).toBe(existingContent);
    });
  });

  describe("#when the config directory does not exist", () => {
    it("#then it creates the directory and the config file", async () => {
      const nestedDir = join(tempDir, "nested", "goatcode");
      process.env.GOATCODE_CONFIG_DIR = nestedDir;
      expect(existsSync(nestedDir)).toBe(false);

      await ensureUserConfig();

      expect(existsSync(nestedDir)).toBe(true);
      const configPath = join(nestedDir, "config.ts");
      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe("#when an error occurs during write", () => {
    it("#then it does not throw", async () => {
      // Point to an invalid path that can't be created
      process.env.GOATCODE_CONFIG_DIR = "/dev/null/impossible";

      // Should not throw — errors are swallowed
      await expect(ensureUserConfig()).resolves.toBeUndefined();
    });
  });
});
