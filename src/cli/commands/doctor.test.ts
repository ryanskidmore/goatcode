import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkConfigExists, formatCheckLine, getConfigLocations } from "./doctor";

describe("#given doctor checks", () => {
  describe("#when checkConfigExists is called", () => {
    it("#then returns fail when config file is absent", () => {
      const result = checkConfigExists("/nonexistent/path/that/does/not/exist");
      expect(result.status).toBe("fail");
      expect(result.name).toBe("Config locations");
      expect(result.detail).toContain("user=");
      expect(result.detail).toContain("project=");
    });

    it("#then returns pass when config file exists", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "goatcode-doctor-test-"));
      try {
        writeFileSync(join(tempDir, "goatcode.config.ts"), "", "utf8");
        const result = checkConfigExists(tempDir);
        expect(result.status).toBe("pass");
        expect(result.name).toBe("Config locations");
        expect(result.detail).toContain("project=");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("#then returns a result with the correct name when config is missing", () => {
      const result = checkConfigExists("/nonexistent/path/that/does/not/exist");
      expect(result.name).toBe("Config locations");
      expect(result.status === "pass" || result.status === "fail").toBe(true);
    });

    it("#then returns pass when only user config exists", () => {
      const tempProjectDir = mkdtempSync(join(tmpdir(), "goatcode-doctor-project-"));
      const tempUserBaseDir = mkdtempSync(join(tmpdir(), "goatcode-doctor-user-"));
      const userConfigDir = join(tempUserBaseDir, "config-dir");
      const previousConfigDir = process.env.GOATCODE_CONFIG_DIR;
      try {
        mkdirSync(userConfigDir);
        writeFileSync(join(userConfigDir, "config.ts"), "", "utf8");
        process.env.GOATCODE_CONFIG_DIR = userConfigDir;

        const result = checkConfigExists(tempProjectDir);
        expect(result.status).toBe("pass");
        expect(result.detail).toContain("user=");
        expect(result.detail).toContain("(found)");
      } finally {
        process.env.GOATCODE_CONFIG_DIR = previousConfigDir;
        rmSync(tempProjectDir, { recursive: true, force: true });
        rmSync(tempUserBaseDir, { recursive: true, force: true });
      }
    });
  });

  describe("#when formatCheckLine is called", () => {
    it("#then formats a pass result correctly", () => {
      const result = {
        name: "TypeScript installed",
        status: "pass" as const,
        detail: "Version 5.4.5",
      };
      const line = formatCheckLine(result);
      expect(line).toBe("[PASS] TypeScript installed (Version 5.4.5)");
    });

    it("#then formats a fail result correctly", () => {
      const result = {
        name: "Config locations",
        status: "fail" as const,
        detail: "user=/tmp/a/config.ts (missing), project=/tmp/b/goatcode.config.ts (missing)",
      };
      const line = formatCheckLine(result);
      expect(line).toBe(
        "[FAIL] Config locations (user=/tmp/a/config.ts (missing), project=/tmp/b/goatcode.config.ts (missing))",
      );
    });

    it("#then uses PASS tag for pass status", () => {
      const result = { name: "Bun installed", status: "pass" as const, detail: "1.2.0" };
      const line = formatCheckLine(result);
      expect(line.startsWith("[PASS]")).toBe(true);
    });

    it("#then uses FAIL tag for fail status", () => {
      const result = {
        name: "Bun installed",
        status: "fail" as const,
        detail: "bun not found in PATH",
      };
      const line = formatCheckLine(result);
      expect(line.startsWith("[FAIL]")).toBe(true);
    });
  });

  describe("#when checkTypeScript is called", () => {
    it("#then returns a result with the correct check name", async () => {
      const { checkTypeScript } = await import(`./doctor?ts=${Date.now()}`);
      const result = await checkTypeScript();
      expect(result.name).toBe("TypeScript installed");
      expect(result.status === "pass" || result.status === "fail").toBe(true);
      expect(typeof result.detail).toBe("string");
    });
  });

  describe("#when checkBun is called", () => {
    it("#then returns pass with version detail since bun is running the tests", async () => {
      const { checkBun } = await import(`./doctor?bun=${Date.now()}`);
      const result = await checkBun();
      expect(result.name).toBe("Bun installed");
      expect(result.status).toBe("pass");
      expect(result.detail).toMatch(/^\d+\.\d+/);
    });
  });

  describe("#when checkConfigValid is called with missing config", () => {
    it("#then returns fail with not found message", async () => {
      const { checkConfigValid } = await import(`./doctor?cfg=${Date.now()}`);
      const result = await checkConfigValid("/nonexistent/path/that/does/not/exist");
      expect(result.name).toBe("Config is valid");
      expect(result.status).toBe("fail");
      expect(result.detail).toContain("No valid user or project config");
    });
  });

  describe("#when runDoctor is called with a missing directory", () => {
    it("#then returns exitCode 1 because config checks fail", async () => {
      const { runDoctor } = await import(`./doctor?run=${Date.now()}`);
      const result = await runDoctor("/nonexistent/path/that/does/not/exist");
      expect(result.exitCode).toBe(1);
      expect(result.checks.length).toBe(4);
    });

    it("#then includes all four check names in results", async () => {
      const { runDoctor } = await import(`./doctor?run2=${Date.now()}`);
      const result = await runDoctor("/nonexistent/path/that/does/not/exist");
      const names = result.checks.map((c: { name: string }) => c.name);
      expect(names).toContain("TypeScript installed");
      expect(names).toContain("Bun installed");
      expect(names).toContain("Config locations");
      expect(names).toContain("Config is valid");
    });

    it("#then config check has fail status for missing directory", async () => {
      const { runDoctor } = await import(`./doctor?run3=${Date.now()}`);
      const result = await runDoctor("/nonexistent/path/that/does/not/exist");
      const configCheck = result.checks.find(
        (c: { name: string }) => c.name === "Config locations",
      );
      expect(configCheck?.status).toBe("fail");
    });
  });

  describe("#when getConfigLocations is called", () => {
    it("#then returns both user and project config paths", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "goatcode-doctor-locations-"));
      const tempUserBaseDir = mkdtempSync(join(tmpdir(), "goatcode-doctor-user-locations-"));
      const userConfigDir = join(tempUserBaseDir, "custom");
      const previousConfigDir = process.env.GOATCODE_CONFIG_DIR;

      try {
        mkdirSync(userConfigDir);
        process.env.GOATCODE_CONFIG_DIR = userConfigDir;

        const locations = getConfigLocations(tempDir);
        expect(locations.userConfigPath).toBe(join(userConfigDir, "config.ts"));
        expect(locations.projectConfigPath).toBe(join(tempDir, "goatcode.config.ts"));
      } finally {
        process.env.GOATCODE_CONFIG_DIR = previousConfigDir;
        rmSync(tempDir, { recursive: true, force: true });
        rmSync(tempUserBaseDir, { recursive: true, force: true });
      }
    });
  });
});
